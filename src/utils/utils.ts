import { firestore } from 'firebase-admin'

export function getDocData(doc: firestore.DocumentSnapshot): any {
    if (!doc.exists) {
        const err:any = new Error(`Document at:${doc.ref.path} doesn't exist.`)
        err.code = 404
        throw err
    } else {
        return doc.data()!
    }
}