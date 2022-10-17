import { firestore } from 'firebase-admin';
import { Repository } from './repository';
import { randomId } from './utils';
import { Transaction } from './transaction';
import { CollectionReference, DocumentReference } from './wrapped';
import * as zlib from 'zlib';

export type OutboxEvent = {
  id: string;
  topic: string;
  timeCreated: firestore.Timestamp;
  timeSent?: firestore.Timestamp;
  sentToBus: boolean;
  data: any;
};

export type Compression = 'none' | 'gzip';

export class Outbox extends Repository<OutboxEvent> {
  private readonly _collection: CollectionReference;

  private readonly _compression: Compression;

  constructor(collectionPath: string, transaction: Transaction, compression: Compression) {
    super(transaction);
    this._collection = transaction.context.collection(collectionPath);
    this._compression = compression;
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

  private _compressData(data: any): Promise<any> {
    if (this._compression === 'gzip') {
      return this._gzip(data);
    }
    return data;
  }

  private _gzip(data: any): Promise<any> {
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

  protected async toDocuments(item: OutboxEvent): Promise<{ ref: DocumentReference; data: any }[]> {
    const compressedMessage = {
      ...item,
      data: await this._compressData(item.data),
    };
    return Promise.resolve([
      {
        ref: this._collection.doc(item.id),
        data: compressedMessage,
      },
    ]);
  }
}
