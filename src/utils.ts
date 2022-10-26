import { firestore } from 'firebase-admin';
import * as zlib from 'zlib';
import { Message } from './types';

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
  return firestore().collection('_').doc().id;
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
  const plaintext = Buffer.from(data.message.data, 'base64').toString();
  const message: Message = JSON.parse(plaintext);
  // JSON.parse does not convert date strings to Date objects.
  message.timeCreated = new Date(message.timeCreated);
  message.timeSent = new Date(message.timeSent);
  // this package internally compresses message data using gzip.
  message.data = await gunzip(message.data.toString());
  return message;
}
