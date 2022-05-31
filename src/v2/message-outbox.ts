import { Event, EventSchema } from "../outbox/types";
import { DbContext } from "./db-context";
import { Repository } from "./repository";
import { nanoid } from 'nanoid'
import { FireDocument } from "../types";


export class MessageOutbox extends Repository<Event> {

    private _collectionPath: string

    constructor(collectionPath: string, context: DbContext) {
        super(context)
        this._collectionPath = collectionPath
    }

    queue(data: any, topic: string): string {
        const event: Event = {
            id: nanoid(),
            topic: topic,
            timeCreated: new Date(),
            timeSent: undefined,
            sentToBus: false,
            data: data
        }
        this.add(event)
        return event.id
    }

    async getNextToSend(): Promise<Event> {
        const schema = await this.context.firestore.collection(this._collectionPath)
            .where('sentToBus', '==', false)
            .orderBy('timeCreated', 'asc')
            .limit(1)
            .get()
            .then(snap => {
                if (snap.docs.length === 0) {
                    const err: any = new Error('No events found.')
                    err.code = 404
                    throw err
                }
                return snap.docs[0].data() as EventSchema
            })
        const event = this._decode(schema)
        super.track(event)
        return event
    }

    protected toDocuments(item: Event): FireDocument[] {
        return [{ ref: this.context.firestore.collection(this._collectionPath).doc(item.id), data: item }]
    }

    private _decode(schema: EventSchema): Event {
        return {
            id: schema.id,
            topic: schema.topic,
            timeCreated: schema.timeCreated.toDate(),
            timeSent: schema.timeSent?.toDate(),
            sentToBus: schema.sentToBus,
            data: schema.data
        }
    }

}