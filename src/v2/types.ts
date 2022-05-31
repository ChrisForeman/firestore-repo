import { DatabaseOp } from "../types"
import { firestore } from "firebase-admin"

export type RepoOp = {
    opType: DatabaseOp,
    doc: { ref: firestore.DocumentReference, data: any }
}