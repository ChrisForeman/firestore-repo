import * as admin from 'firebase-admin';
import { DocumentTracker } from './document-tracker';
import { Identifiable, CollectionReference, DocumentReference } from './types';
import { Repository } from './repository';
import { DBContext } from './db-context';
import { DocumentReferenceDefault, CollectionReferenceDefault } from './wrapped';

export class Transaction {
  private _transaction: admin.firestore.Transaction;

  private _tracker: DocumentTracker;

  private _repos: Repository<any>[];

  private _firestore: admin.firestore.Firestore;

  /**
   * @deprecated Use this collection and doc methods to get a reference to firestore.
   */
  readonly context: DBContext;

  constructor(transaction: admin.firestore.Transaction, firestore: admin.firestore.Firestore) {
    this._transaction = transaction;
    this._tracker = new DocumentTracker();
    this._repos = [];
    this._firestore = firestore;
    this.context = new DBContext(firestore, this._tracker);
  }

  /**
   * Retrieves a query result. Holds a pessimistic lock on all returned
   * documents.
   *
   * @param query A query to execute.
   * @return A QuerySnapshot for the retrieved data.
   */
  get<T>(query: admin.firestore.Query<T>): Promise<admin.firestore.QuerySnapshot<T>>;
  /**
   * Reads the document referenced by the provided `DocumentReference.`
   * Holds a pessimistic lock on the returned document.
   *
   * @param documentRef A reference to the document to be read.
   * @return A DocumentSnapshot for the read data.
   */
  get<T>(
    documentRef: admin.firestore.DocumentReference<T>
  ): Promise<admin.firestore.DocumentSnapshot<T>>;
  get<T>(
    arg: admin.firestore.Query<T> | admin.firestore.DocumentReference<T>
  ): Promise<admin.firestore.QuerySnapshot<T> | admin.firestore.DocumentSnapshot<T>> {
    if (arg instanceof admin.firestore.Query) {
      return this._transaction.get(arg);
    } else {
      return this._transaction.get(arg);
    }
  }

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @return The `CollectionReference` instance.
   */
  collection(collectionPath: string, trackChanges: boolean = true): CollectionReference {
    return new CollectionReferenceDefault({
      ref: this._firestore.collection(collectionPath),
      tracker: this._tracker,
      trackChanges,
      transaction: this,
    });
  }

  /**
   * Gets a `DocumentReference` instance that refers to the document at the
   * specified path.
   *
   * @param documentPath A slash-separated path to a document.
   * @return The `DocumentReference` instance.
   */
  doc(documentPath: string, trackChanges: boolean = true): DocumentReference {
    return new DocumentReferenceDefault({
      ref: this._firestore.doc(documentPath),
      tracker: this._tracker,
      trackChanges,
      transaction: this,
    });
  }

  addRepo<T extends Identifiable>(repo: Repository<T>): void {
    this._repos.push(repo);
  }

  async commit(): Promise<void> {
    const nestedOps = await Promise.all(this._repos.map((r) => r.operations()));
    const repoOps = nestedOps.flatMap((op) => op);

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
