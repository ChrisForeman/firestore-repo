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
  collection(collectionPath: string, trackChanges: boolean = true): CollectionReference {
    return new CollectionReference({
      ref: this._firestore.collection(collectionPath),
      tracker: this._tracker,
      trackChanges,
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
    return new DocumentReference({
      ref: this._firestore.doc(documentPath),
      tracker: this._tracker,
      trackChanges,
    });
  }
}
