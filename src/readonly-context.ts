import { firestore } from 'firebase-admin'
import { DatabaseContext } from './database-context'
import { BaseRepo } from './repository'

export class ReadonlyContext implements DatabaseContext {

    readonly db: firestore.Firestore

    constructor(db: firestore.Firestore) {
        this.db = db
    }

    getDoc(ref: firestore.DocumentReference): Promise<firestore.DocumentSnapshot> {
        return ref.get()
    }

    queryDocs(query: firestore.Query): Promise<firestore.QuerySnapshot<firestore.DocumentData>> {
        return query.get()
    }


    //Only for updating documents. Not creation.
    private convertUndefined(data: Record<string, any>): any {
        const result: Record<string, any> = {}
        Object.keys(data).forEach(key => {
            //If we find a key explicitly assigned to the undefined value, it should be deleted from the database.
            if (data[key] !== undefined) {
                result[key] = data[key]
            } else {
                result[key] = firestore.FieldValue.delete()
            }
        })
        return result
    }

    private toCollection(union: BaseRepo<any> | BaseRepo<any>[]): BaseRepo<any>[] {
        if (union instanceof BaseRepo) {
            return [union]
        } else {
            return union
        }
    }

    async commit(union: BaseRepo<any> | BaseRepo<any>[]): Promise<void> {

        const repos = this.toCollection(union)

        const allOps = repos.map(repo => repo.operations()).flatMap(op => op)

        await Promise.all(allOps.map(({ opType, doc }) => {
            if (opType === 'Create') {
                return doc.ref.create(doc.data)
            } else if (opType === 'Delete') {
                return doc.ref.delete()
            } else if (opType === 'Update') {
                return doc.ref.set(this.convertUndefined(doc.data), { merge: true })
            } else {
                throw new Error('Invalid op type.')
            }
        }))
    }

}