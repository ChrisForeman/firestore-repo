import { PubSub } from "@google-cloud/pubsub";
import { firestore } from "firebase-admin";
import * as zlib from "zlib";
import { OutboxEvent } from "./outbox";
import { EventDTO, Message } from "./types";

export function getDocData(doc: firestore.DocumentSnapshot): any {
  if (!doc.exists) {
    const err: any = new Error(`Document at:${doc.ref.path} doesn't exist.`);
    err.code = 404; //TODO: Perhaps make this a string code "not-found" since 404 is in the context of http errors.
    throw err;
  } else {
    return doc.data()!;
  }
}

export function randomId(): string {
  return firestore().collection("_").doc().id;
}

function gunzip(data: any): Promise<Buffer> {
  return new Promise<Buffer>((res, rej) => {
    zlib.gunzip(data, (err, buf) => {
      if (err) {
        rej(err);
      } else {
        res(buf);
      }
    });
  });
}

/**
 * Decodes a message from PubSub since the message data is base64 encoded.
 * @param data
 * @returns
 */
export async function decodeMessage(data: any): Promise<Message> {
  // the message is being stored in the pubsub message .data property.
  // pubsub message .data property is a base64 encoded string.
  const plaintext = Buffer.from(data.message.data, "base64").toString();
  const message: Message = JSON.parse(plaintext);
  // JSON.parse does not convert date strings to Date objects.
  message.timeCreated = new Date(message.timeCreated);
  message.timeSent = new Date(message.timeSent);
  message.deliveryAttempt = data.deliveryAttempt ?? 0; // Pubsub adds this property to the body at the same hierarchy level as the message data.
  message.subscription = data.subscription ?? ""; // Pubsub adds this property to the body at the same hierarchy level as the message data.
  // this package internally compresses message data using gzip.
  const unzipped = await gunzip(Buffer.from(message.data)); // need to convert string to buffer
  message.data = JSON.parse(unzipped.toString());
  return message;
}

function gzip(data: any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    zlib.gzip(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function compressData(data: any): Promise<any> {
  const json = JSON.stringify(data);
  return gzip(json);
}

const dtoEvent = (event: OutboxEvent, timeSent: Date): EventDTO => ({
  id: event.id,
  topic: event.topic,
  timeCreated: event.timeCreated.toDate().toISOString(),
  timeSent: timeSent.toISOString(),
  data: event.data,
});

/**
 * Publishes a message to pubsub where the nested message data is compressed via gzip.
 * @param pubsub The pubsub object in use.
 * @param topic The topic to publish the message to.
 * @param data The nested data to within the message object.
 * @returns The entire message.
 */
export async function publishMessage(
  pubsub: PubSub,
  topic: string,
  data: any,
  messageId?: string
): Promise<OutboxEvent> {
  const event: OutboxEvent = {
    id: messageId ?? randomId(),
    topic: topic,
    timeCreated: firestore.Timestamp.now(),
    timeSent: firestore.Timestamp.now(),
    sentToBus: true,
    data: await compressData(data),
  };
  const json = dtoEvent(event, new Date());
  await pubsub.topic(topic).publishMessage({ json });
  return event;
}
