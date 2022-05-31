import { firestore } from 'firebase-admin'
import { TransactionContextDocumentTracker } from '../tracker'
import { Identifiable } from '../types'
import { Repository } from './repository'

export class DbContext {

    private _transaction: firestore.Transaction

    private _tracker: TransactionContextDocumentTracker

    private _repos: Repository<any>[]

    readonly firestore: firestore.Firestore

    constructor(transaction: firestore.Transaction, firestore: firestore.Firestore) {
        this._transaction = transaction
        this._tracker = new TransactionContextDocumentTracker()
        this._repos = []
        this.firestore = firestore
    }

    async getDoc(ref: firestore.DocumentReference): Promise<firestore.DocumentSnapshot> {
        return this._transaction.get(ref).then(doc => {
            this._tracker.track(ref.path, doc.data())
            return doc
        })
    }

    queryDocs(query: firestore.Query): Promise<firestore.QuerySnapshot<firestore.DocumentData>> {
        return this._transaction.get(query).then(snapshot => {
            snapshot.docs.forEach(doc => {
                this._tracker.track(doc.ref.path, doc.data())
            })
            return snapshot
        })
    }

    addRepo<T extends Identifiable>(repo: Repository<T>): void {
        this._repos.push(repo)
    }

    commit(): void {

        const repoOps = this._repos.map(r => r.operations()).flatMap(op => op)

        for (const { opType, doc } of repoOps) {
            if (opType === 'Create') {
                this._transaction.create(doc.ref, doc.data)
            } else if (opType === 'Delete') {
                this._transaction.delete(doc.ref)
            } else if (opType === 'Update') {
                //For performance and to help with Firestore transaction 500 write limit, we need to check if the document data was changed since when it was read.
                const writeData = this._tracker.changedData(doc.ref.path, doc.data)
                if (writeData !== undefined) {
                    this._transaction.set(doc.ref, writeData, { merge: true }) //Using set with merge option because if a Model is an aggregate that adds a child item that will be converted to a new document, if we use ref.update() we will get an exception.
                }
            } else {
                throw new Error('Invalid op type.')
            }
        }
    }

}
