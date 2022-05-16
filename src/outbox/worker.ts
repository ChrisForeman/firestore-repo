import { PubSub } from "@google-cloud/pubsub";
import { firestore } from "firebase-admin";
import * as functions from 'firebase-functions'
import { EventSchema } from "./types";

type Worker = functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>


export function OutboxWorker(
    outboxPath: string,
    bus: PubSub,
    options?: { regions?: string, runtime?: functions.RuntimeOptions }
): Worker {

    function toDTO(event: EventSchema, timeSent: Date): EventDTO {
        return {
            id: event.id,
            topic: event.topic,
            timeCreated: event.timeCreated.toDate(),
            timeSent: timeSent,
            data: event.data
        }
    }


    const segments = outboxPath.split('/')
    if (segments.length % 2 === 0) {
        throw new Error('Invalid number of segments in path. Must be odd.')
    }
    const docBuilder = () => {
        if (options?.regions) {
            return functions.region(options.regions).firestore.document(`${outboxPath}/{docId}`)
        } else {
            return functions.firestore.document(`${outboxPath}/{docId}`)
        }
    }
    return docBuilder().onCreate(async (snapshot, context) => {

        const schema = snapshot.data() as EventSchema

        if (schema.sentToBus === true) { return }

        schema.sentToBus = true
        schema.timeSent = firestore.Timestamp.now()

        await bus.topic(schema.topic).publishMessage({ json: toDTO(schema, new Date()) })

        await snapshot.ref.update(schema)
    })
}


export type EventDTO = {
    id: string //UUID
    topic: string
    timeCreated: Date
    timeSent: Date
    data: any
}


export class Subscription {

    private _topic: string

    private _region: string

    constructor(topic: string, region: string) {
        this._topic = topic
        this._region = region
    }

    receive(handler: (event: EventDTO) => any): functions.CloudFunction<functions.pubsub.Message> {
        return functions.region(this._region).pubsub.topic(this._topic).onPublish(async (rawMessage, context) => {
            const dto = this._decode(rawMessage.data)
            return handler(dto)
        })
    }

    private _decode(base64: string): EventDTO {
        const plaintext = Buffer.from(base64, 'base64').toString()
        const message = JSON.parse(plaintext)
        message.timeCreated = new Date(message.timeCreated)
        message.timeSent = new Date(message.timeSent)
        return message as EventDTO
    }
}

// export class OutboxWorkerOld {

//     private _db: firestore.Firestore

//     private _collectionPath: string

//     private _bus: PubSub

//     constructor(db: firestore.Firestore, bus: PubSub, collectionPath: string) {
//         this._db = db
//         this._collectionPath = collectionPath
//         this._bus = bus
//     }

//     async work(): Promise<void> {

//         /**
//          * For performance and cost efficency, don't use transaction because:
//          * 1. To do all events in parallel, we'd either have to lock all at same time which could cause a lot of extra pubsub calls if transaction runs multiple times. Not to mention we're limited to 500 documents per transaction.
//          * 2. Otherwise we'd have to read each event twice, once to get id, second time in it's own transactions
//          * 3. It's idempotent, it shouldn't be problematic and a transaction wouldn't do much in preventing duplicate publishings to pubsub since it can re-run if it fails.
//         */


//         let noMoreEvents: boolean = false

//         while (!noMoreEvents) {

//             await new UnitOfWorkDefault(this._db).commit<Outbox, void>(context => new Outbox(this._collectionPath, context), async outbox => {

//                 const event = await outbox.getNextToSend()

//                 await this._bus.topic(event.topic).publishMessage({ json: event })

//                 event.sentToBus = true

//             }).catch(err => {
//                 if (err.code === 'not-found') {
//                     noMoreEvents = true
//                 }
//             })

//         }

//         // const docs = await this._db.collection(this._collectionPath)
//         //     .where('sentToBus', '==', false).get()
//         //     .then(snap => snap.docs)

//         // await Promise.all(docs.map(async doc => {

//         //     const event = this._toDomainEvent(doc.data() as EventSchema)

//         //     //If an only if we succeed in publishing to pubsub, we will try to mark the event as sent. Otherwise it may get sent to pubsub again.
//         //     await this._bus.topic(event.topic).publishMessage({ json: event }).then(async () => {
//         //         const updateData: Partial<EventSchema> = { sentToBus: true }
//         //         await doc.ref.update(updateData)
//         //     }).catch(() => {
//         //         return //mission failed, we'll get em next time. (on the next .work() invocation)
//         //     })

//         // }))

//     }

// }