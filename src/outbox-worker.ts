import { PubSub } from '@google-cloud/pubsub';
import { firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';
import { OutboxEvent } from './outbox';
import { EventDTO } from './types';

type Worker = functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;

function toDTO(event: OutboxEvent, timeSent: Date): EventDTO {
  return {
    id: event.id,
    topic: event.topic,
    timeCreated: event.timeCreated.toDate().toISOString(),
    timeSent: timeSent.toISOString(),
    data: event.data,
  };
}

function buildDocument(
  outboxPath: string,
  region?: string
): functions.firestore.DocumentBuilder<string> {
  const path = `${outboxPath}/{docId}`;
  if (region) {
    return functions.region(region).firestore.document(path);
  } else {
    return functions.firestore.document(path);
  }
}

export function OutboxWorker(
  outboxPath: string,
  bus: PubSub,
  options?: { regions?: string; runtime?: functions.RuntimeOptions; deleteOnSuccess?: boolean }
): Worker {
  const segments = outboxPath.split('/');
  if (segments.length % 2 === 0) {
    throw new Error('Invalid number of segments in path. Must be odd.');
  }
  return buildDocument(outboxPath, options?.regions).onCreate(async (snapshot, context) => {
    const schema = snapshot.data() as OutboxEvent;
    if (schema.sentToBus === true) {
      return;
    }
    schema.sentToBus = true;
    schema.timeSent = firestore.Timestamp.now();
    // send to pubsub first to guaruntee at least once delivery incase it fails.
    await bus.topic(schema.topic).publishMessage({ json: toDTO(schema, new Date()) });
    if (options?.deleteOnSuccess) {
      await snapshot.ref.delete();
    } else {
      await snapshot.ref.update(schema);
    }
  });
}
