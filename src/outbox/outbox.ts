import { DatabaseContext } from "../database-context";
import { BaseRepo } from "../repository";
import { FireDocument } from "../types";
import { Event, EventSchema } from './types'
import { v4 as uuidv4 } from 'uuid';

export class Outbox extends BaseRepo<Event> {

    private _collectionPath: string

    constructor(collectionPath: string, context: DatabaseContext) {
        super(context)
        this._collectionPath = collectionPath
    }

    queue(data: any, topic: string): string {
        const event: Event = {
            id: uuidv4(),
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
        const schema = await this.context.db.collection(this._collectionPath)
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
        const event = this._toDomainEvent(schema)
        super.track(event)
        return event
    }

    protected toDocuments(item: Event): FireDocument[] {
        return [{ ref: this.context.db.collection(this._collectionPath).doc(item.id), data: item }]
    }

    private _toDomainEvent(schema: EventSchema): Event {
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