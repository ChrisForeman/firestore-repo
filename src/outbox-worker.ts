import { PubSub } from '@google-cloud/pubsub';
import { firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';
import { OutboxEvent } from './outbox';
import { EventDTO } from './types';

type Worker = functions.CloudFunction<functions.firestore.QueryDocumentSnapshot>;

export function toDTO(event: OutboxEvent, timeSent: Date): EventDTO {
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
  regions?: string[],
  runtimeOptions?: functions.RuntimeOptions
): functions.firestore.DocumentBuilder<string> {
  const path = `${outboxPath}/{docId}`;
  let func: functions.FunctionBuilder = functions as any; // functions isn't a function builder type but it has all the same props.
  if (regions) {
    func = func.region(...regions);
  }
  if (runtimeOptions) {
    func = func.runWith(runtimeOptions);
  }
  return func.firestore.document(path);
}

export function OutboxWorker({
  outboxPath,
  bus,
  regions,
  runtime,
  deleteOnPublish,
}: {
  outboxPath: string;
  bus: PubSub;
  regions?: string[];
  runtime?: functions.RuntimeOptions;
  deleteOnPublish?: boolean;
}): Worker {
  const segments = outboxPath.split('/');
  if (segments.length % 2 === 0) {
    throw new Error('Invalid number of segments in path. Must be odd.');
  }
  return buildDocument(outboxPath, regions, runtime).onCreate(async (snapshot, context) => {
    const schema = snapshot.data() as OutboxEvent;
    if (schema.sentToBus === true) {
      return;
    }
    schema.sentToBus = true;
    schema.timeSent = firestore.Timestamp.now();
    // send to pubsub first to guaruntee at least once delivery incase it fails.
    await bus.topic(schema.topic).publishMessage({ json: toDTO(schema, new Date()) });
    if (deleteOnPublish) {
      await snapshot.ref.delete();
    } else {
      await snapshot.ref.update(schema);
    }
  });
}
