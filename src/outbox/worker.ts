import { PubSub } from "@google-cloud/pubsub";
import { firestore } from "firebase-admin";
import { UnitOfWorkDefault } from "../unit-of-work";
import { Outbox } from "./outbox";
import { Event, EventSchema } from "./types";


export class OutboxWorker {

    private _db: firestore.Firestore

    private _collectionPath: string

    private _bus: PubSub

    constructor(db: firestore.Firestore, bus: PubSub, collectionPath: string) {
        this._db = db
        this._collectionPath = collectionPath
        this._bus = bus
    }

    async work(): Promise<void> {

        /**
         * For performance and cost efficency, don't use transaction because:
         * 1. To do all events in parallel, we'd either have to lock all at same time which could cause a lot of extra pubsub calls if transaction runs multiple times. Not to mention we're limited to 500 documents per transaction.
         * 2. Otherwise we'd have to read each event twice, once to get id, second time in it's own transactions
         * 3. It's idempotent, it shouldn't be problematic and a transaction wouldn't do much in preventing duplicate publishings to pubsub since it can re-run if it fails.
        */


        let noMoreEvents: boolean = false

        while (!noMoreEvents) {

            await new UnitOfWorkDefault(this._db).commit<Outbox, void>(context => new Outbox(this._collectionPath, context), async outbox => {

                const event = await outbox.getNextToSend()

                await this._bus.topic(event.topic).publishMessage({ json: event })

                event.sentToBus = true

            }).catch(err => {
                if (err.code === 'not-found') {
                    noMoreEvents = true
                }
            })

        }

        // const docs = await this._db.collection(this._collectionPath)
        //     .where('sentToBus', '==', false).get()
        //     .then(snap => snap.docs)

        // await Promise.all(docs.map(async doc => {

        //     const event = this._toDomainEvent(doc.data() as EventSchema)

        //     //If an only if we succeed in publishing to pubsub, we will try to mark the event as sent. Otherwise it may get sent to pubsub again.
        //     await this._bus.topic(event.topic).publishMessage({ json: event }).then(async () => {
        //         const updateData: Partial<EventSchema> = { sentToBus: true }
        //         await doc.ref.update(updateData)
        //     }).catch(() => {
        //         return //mission failed, we'll get em next time. (on the next .work() invocation)
        //     })

        // }))

    }

}