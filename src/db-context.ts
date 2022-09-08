import * as admin from 'firebase-admin';
import { DocumentTracker } from './document-tracker';
import { CollectionReference, DocumentReference } from './wrapped';

export class DBContext {
  private _firestore: admin.firestore.Firestore;

  private _tracker: DocumentTracker;

  constructor(firestore: admin.firestore.Firestore, tracker: DocumentTracker) {
    this._firestore = firestore;
    this._tracker = tracker;
  }

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @return The `CollectionReference` instance.
   */
  collection(collectionPath: string): CollectionReference {
    return new CollectionReference(this._firestore.collection(collectionPath), this._tracker);
  }

  /**
   * Gets a `DocumentReference` instance that refers to the document at the
   * specified path.
   *
   * @param documentPath A slash-separated path to a document.
   * @return The `DocumentReference` instance.
   */
  doc(documentPath: string): DocumentReference {
    return new DocumentReference(this._firestore.doc(documentPath), this._tracker);
  }
}
