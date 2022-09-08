import * as admin from 'firebase-admin';
import { DocumentTracker } from './document-tracker';
import { Identifiable } from './types';
import { Repository } from './repository';
import { DBContext } from './db-context';

export class Transaction {
  private _transaction: admin.firestore.Transaction;

  private _tracker: DocumentTracker;

  private _repos: Repository<any>[];

  private _firestore: admin.firestore.Firestore;

  readonly context: DBContext;

  constructor(transaction: admin.firestore.Transaction, firestore: admin.firestore.Firestore) {
    this._transaction = transaction;
    this._tracker = new DocumentTracker();
    this._repos = [];
    this._firestore = firestore;
    this.context = new DBContext(firestore, this._tracker);
  }

  addRepo<T extends Identifiable>(repo: Repository<T>): void {
    this._repos.push(repo);
  }

  commit(): void {
    const repoOps = this._repos.map((r) => r.operations()).flatMap((op) => op);

    for (const { opType, doc } of repoOps) {
      if (opType === 'Create') {
        this._transaction.create(this._firestore.doc(doc.ref.path), doc.data);
      } else if (opType === 'Delete') {
        this._transaction.delete(this._firestore.doc(doc.ref.path));
      } else if (opType === 'Update') {
        //For performance and to help with Firestore transaction 500 write limit, we need to check if the document data was changed since when it was read.
        const writeData = this._tracker.changedData(doc.ref.path, doc.data);
        if (writeData !== undefined) {
          this._transaction.set(this._firestore.doc(doc.ref.path), writeData, { merge: true }); //Using set with merge option because if a Model is an aggregate that adds a child item that will be converted to a new document, if we use ref.update() we will get an exception.
        }
      } else {
        throw new Error('Invalid op type.');
      }
    }
  }
}
