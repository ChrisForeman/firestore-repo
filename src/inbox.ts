
import { Repository } from "./repository";
import { Transaction } from "./transaction";
import { DocumentReference } from "./wrapped";

type Event = {
    id: string
    timeReceived: Date
}

export class Inbox extends Repository<Event> {

    private _collectionPath: string

    constructor(collectionPath: string, context: Transaction) {
        super(context)
        this._collectionPath = collectionPath
    }

    get(id: string): Promise<Event> {
        return this.transaction.collection(this._collectionPath).doc(id).get().then(doc => {
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
        return this.transaction.collection(this._collectionPath).doc(id).get().then(doc => doc.exists)
    }

    protected toDocuments(item: Event): {
        ref: DocumentReference
        data: any
    }[] {
        return [{ ref: this.transaction.collection(this._collectionPath).doc(item.id), data: item }]
    }
}