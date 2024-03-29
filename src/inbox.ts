import { Repository } from './repository';
import { Transaction } from './transaction';
import { CollectionReference, DocumentReference } from './types';

type Event = {
  id: string;
  timeReceived: Date;
};

export class Inbox extends Repository<Event> {
  private _collection: CollectionReference;

  constructor(collectionPath: string, transaction: Transaction) {
    super(transaction);
    this._collection = transaction.collection(collectionPath);
  }

  get(id: string): Promise<Event> {
    return this._collection
      .doc(id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return doc.data() as Event;
        } else {
          const err: any = new Error('Not found.');
          err.code = 404;
          throw err;
        }
      });
  }

  didProcessEvent(id: string): Promise<boolean> {
    return this._collection
      .doc(id)
      .get()
      .then((doc) => doc.exists);
  }

  protected toDocuments(item: Event): Promise<{ ref: DocumentReference; data: any }[]> {
    return Promise.resolve([{ ref: this._collection.doc(item.id), data: item }]);
  }
}
