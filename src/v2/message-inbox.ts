
import { FireDocument } from "../types";
import { Event } from "../inbox/event";
import { Repository } from "./repository";
import { DbContext } from "./db-context";
import { firestore } from "firebase-admin";

export class MessageInbox extends Repository<Event> {

    private _collection: firestore.CollectionReference

    constructor(collectionPath: string, context: DbContext) {
        super(context)
        this._collection = context.firestore.collection(collectionPath)
    }

    get(id: string): Promise<Event> {
        const ref = this._collection.doc(id)
        return ref.get().then(doc => {
            if (doc.exists) {
                return doc.data() as Event
            } else {
                const err: any = new Error('Not found.')
                err.code = 404
                throw err
            }
        })
    }

    didProcessEvent(id: string): Promise<boolean> {
        const ref = this._collection.doc(id)
        return ref.get().then(doc => doc.exists)
    }

    protected toDocuments(item: Event): FireDocument[] {
        return [{ ref: this._collection.doc(item.id), data: item }]
    }
}