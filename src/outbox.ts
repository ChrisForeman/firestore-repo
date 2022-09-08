import { firestore } from 'firebase-admin';
import { Repository } from './repository';
import { randomId } from './utils';
import { Transaction } from './transaction';
import { CollectionReference, DocumentReference } from './wrapped';

export type OutboxEvent = {
  id: string;
  topic: string;
  timeCreated: firestore.Timestamp;
  timeSent?: firestore.Timestamp;
  sentToBus: boolean;
  data: any;
};

export class Outbox extends Repository<OutboxEvent> {
  private _collection: CollectionReference;

  constructor(collectionPath: string, transaction: Transaction) {
    super(transaction);
    this._collection = transaction.context.collection(collectionPath);
  }

  queue(data: any, topic: string): string {
    const event: OutboxEvent = {
      id: randomId(),
      topic: topic,
      timeCreated: firestore.Timestamp.now(),
      timeSent: undefined,
      sentToBus: false,
      data: data,
    };
    this.add(event);
    return event.id;
  }

  async getNextToSend(): Promise<OutboxEvent> {
    const event = await this._collection
      .where('sentToBus', '==', false)
      .orderBy('timeCreated', 'asc')
      .limit(1)
      .get()
      .then((snap) => {
        if (snap.docs.length === 0) {
          const err: any = new Error('No events found.');
          err.code = 404;
          throw err;
        }
        return snap.docs[0].data() as OutboxEvent;
      });
    super.track(event);
    return event;
  }

  protected toDocuments(item: OutboxEvent): {
    ref: DocumentReference;
    data: any;
  }[] {
    return [{ ref: this._collection.doc(item.id), data: item }];
  }
}
