import { firestore } from 'firebase-admin'
import { BaseRepo } from './repository'
import { TransactionContextDocumentTracker } from './tracker'
import { DatabaseContext } from './database-context'

export class TransactionContext implements DatabaseContext {

    readonly db: firestore.Firestore

    private transaction?: firestore.Transaction

    private tracker: TransactionContextDocumentTracker

    constructor(db: firestore.Firestore) {
        this.db = db
        this.tracker = new TransactionContextDocumentTracker()
    }

    async getDoc(ref: firestore.DocumentReference): Promise<firestore.DocumentSnapshot> {
        if (this.transaction === undefined) {
            throw new Error('Tried to do work before the transaction had begun.')
        }
        return this.transaction.get(ref).then(doc => {
            this.tracker.track(ref.path, doc.data())
            return doc
        })
    }

    queryDocs(query: firestore.Query): Promise<firestore.QuerySnapshot<firestore.DocumentData>> {
        if (this.transaction === undefined) {
            throw new Error('Tried to do work before the transaction had begun.')
        }
        return this.transaction.get(query).then(snapshot => {
            snapshot.docs.forEach(doc => {
                this.tracker.track(doc.ref.path, doc.data())
            })
            return snapshot
        })
    }

    private toCollection(union: BaseRepo<any> | BaseRepo<any>[]): BaseRepo<any>[] {
        if (union instanceof BaseRepo) {
            return [union]
        } else {
            return union
        }
    }


    async commit<T>(union: BaseRepo<any>[] | BaseRepo<any>, work: (repos: BaseRepo<any>[] | BaseRepo<any>) => Promise<T>): Promise<T> {
        return this.db.runTransaction(async transaction => {

            this.transaction = transaction

            //Because this block may run multiple times, we need to reset the repositories before re-performing the work.
            const repos = this.toCollection(union)
            repos.forEach(repo => (repo as any).__items = []) //Force access internal props.

            //And reset the tracker
            this.tracker.reset()

            const workResult = await work(union)

            //Once work is done. We want to translate it to our database.
            const allOps = repos.map(repo => repo.operations()).flatMap(op => op)

            for (const { opType, doc } of allOps) {
                if (opType === 'Create') {
                    transaction.create(doc.ref, doc.data)
                } else if (opType === 'Delete') {
                    transaction.delete(doc.ref)
                } else if (opType === 'Update') {
                    //For performance and to help with Firestore transaction 500 write limit, we need to check if the document data was changed since when it was read.
                    const writeData = this.tracker.changedData(doc.ref.path, doc.data)
                    if (writeData !== undefined) {
                        transaction.set(doc.ref, writeData, { merge: true }) //Using set with merge option because if a Model is an aggregate that adds a child item that will be converted to a new document, if we use ref.update() we will get an exception.
                    }
                } else {
                    throw new Error('Invalid op type.')
                }
            }

            this.transaction = undefined

            return workResult //Allows the user to return data out of the work closure.
        })
    }



}