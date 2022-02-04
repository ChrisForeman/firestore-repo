import { firestore } from 'firebase-admin'


export interface DatabaseContext {

    db: firestore.Firestore

    getDoc(ref: firestore.DocumentReference): Promise<firestore.DocumentSnapshot>

    queryDocs(query: firestore.Query): Promise<firestore.QuerySnapshot<firestore.DocumentData>>

}





