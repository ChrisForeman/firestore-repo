// import { PubSub } from "@google-cloud/pubsub";
// import { firestore } from "firebase-admin";
// import * as functions from 'firebase-functions'
// import { OutboxEvent } from "./outbox";

// type Worker = functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>

// export function OutboxWorker(
//     outboxPath: string,
//     bus: PubSub,
//     options?: { regions?: string, runtime?: functions.RuntimeOptions }
// ): Worker {

//     function toDTO(event: OutboxEvent, timeSent: Date): EventDTO {
//         return {
//             id: event.id,
//             topic: event.topic,
//             timeCreated: event.timeCreated.toDate().toISOString(),
//             timeSent: timeSent.toISOString(),
//             data: event.data
//         }
//     }

//     const segments = outboxPath.split('/')
//     if (segments.length % 2 === 0) {
//         throw new Error('Invalid number of segments in path. Must be odd.')
//     }
//     const docBuilder = () => {
//         if (options?.regions) {
//             return functions.region(options.regions).firestore.document(`${outboxPath}/{docId}`)
//         } else {
//             return functions.firestore.document(`${outboxPath}/{docId}`)
//         }
//     }
//     return docBuilder().onCreate(async (snapshot, context) => {

//         const schema = snapshot.data() as OutboxEvent

//         if (schema.sentToBus === true) { return }

//         schema.sentToBus = true
//         schema.timeSent = firestore.Timestamp.now()

//         await bus.topic(schema.topic).publishMessage({ json: toDTO(schema, new Date()) })

//         await snapshot.ref.update(schema)
//     })
// }

export type EventDTO = {
  id: string;
  topic: string;
  timeCreated: string; //iso8601 zulu date
  timeSent: string; //iso8601 zulu date
  data: any;
};

// export class Subscription {

//     private _topic: string

//     private _region: string

//     constructor(topic: string, region: string) {
//         this._topic = topic
//         this._region = region
//     }

//     receive(handler: (event: EventDTO) => any): functions.CloudFunction<functions.pubsub.Message> {
//         return functions.region(this._region).pubsub.topic(this._topic).onPublish(async (rawMessage, context) => {
//             const dto = this._decode(rawMessage.data)
//             return handler(dto)
//         })
//     }

//     private _decode(base64: string): EventDTO {
//         const plaintext = Buffer.from(base64, 'base64').toString()
//         const message = JSON.parse(plaintext)
//         message.timeCreated = new Date(message.timeCreated)
//         message.timeSent = new Date(message.timeSent)
//         return message as EventDTO
//     }
// }
