import { DatabaseContext } from "../database-context";
import { BaseRepo } from "../repository";
import { FireDocument } from "../types";
import { Event } from "./event";


export class Inbox extends BaseRepo<Event> {

    private _collectionPath: string

    constructor(collectionPath: string, context: DatabaseContext) {
        super(context)
        this._collectionPath = collectionPath
    }

    get(id: string): Promise<Event> {
        const ref = this.context.db.collection(this._collectionPath).doc(id)
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
        const ref = this.context.db.collection(this._collectionPath).doc(id)
        return ref.get().then(doc => doc.exists)
    }

    protected toDocuments(item: Event): FireDocument[] {
        return [{ ref: this.context.db.collection(this._collectionPath).doc(item.id), data: item }]
    }
}