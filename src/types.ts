import { firestore } from 'firebase-admin';
export type Identifiable = {
  id: string;
};

export type QuerySnapshot = {
  /**
   * The query on which you called `get` or `onSnapshot` in order to get this
   * `QuerySnapshot`.
   */
  readonly query: Query;
  /** An array of all the documents in the QuerySnapshot. */
  get docs(): Array<QueryDocumentSnapshot>;

  /** The number of documents in the QuerySnapshot. */
  get size(): number;

  /** True if there are no documents in the QuerySnapshot. */
  get empty(): boolean;

  /** The time this query snapshot was obtained. */
  get readTime(): firestore.Timestamp;
};

export type QueryDocumentSnapshot = {
  /**
   * The ID of the document for which this `DocumentSnapshot` contains data.
   */
  get id(): string;
  /**
   * The time this snapshot was read.
   */
  get readTime(): firestore.Timestamp;

  /**
   * The time the document was created.
   */
  get createTime(): firestore.Timestamp;

  /**
   * The time the document was last updated (at the time the snapshot was
   * generated).
   */
  get updateTime(): firestore.Timestamp;

  /**
   * Retrieves all fields in the document as an Object.
   *
   * @override
   * @return An Object containing all fields in the document.
   */
  data(): firestore.DocumentData;
};

export type Query = {
  /**
   * Creates and returns a new Query with the additional filter that documents
   * must contain the specified field and that its value should satisfy the
   * relation constraint provided.
   *
   * This function returns a new (immutable) instance of the Query (rather
   * than modify the existing instance) to impose the filter.
   *
   * @param fieldPath The path to compare
   * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
   * @param value The value for comparison
   * @return The created Query.
   */
  where(fieldPath: string | firestore.FieldPath, opStr: firestore.WhereFilterOp, value: any): Query;
  /**
   * Creates and returns a new Query that's additionally sorted by the
   * specified field, optionally in descending order instead of ascending.
   *
   * This function returns a new (immutable) instance of the Query (rather
   * than modify the existing instance) to impose the order.
   *
   * @param fieldPath The field to sort by.
   * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
   * not specified, order will be ascending.
   * @return The created Query.
   */
  orderBy(
    fieldPath: string | firestore.FieldPath,
    directionStr?: firestore.OrderByDirection
  ): Query;
  /**
   * Creates and returns a new Query that only returns the first matching
   * documents.
   *
   * This function returns a new (immutable) instance of the Query (rather
   * than modify the existing instance) to impose the limit.
   *
   * @param limit The maximum number of items to return.
   * @return The created Query.
   */
  limit(limit: number): Query;
  /**
   * Creates and returns a new Query that starts at the provided document
   * (inclusive). The starting position is relative to the order of the query.
   * The document must contain all of the fields provided in the orderBy of
   * this query.
   *
   * @param snapshot The snapshot of the document to start after.
   * @return The created Query.
   */

  startAt(snapshot: DocumentSnapshot): Query;
  /**
   * Creates and returns a new Query that starts at the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to start this query at, in order
   * of the query's order by.
   * @return The created Query.
   */
  startAt(...fieldValues: any[]): Query;
  startAt(args: any): Query;
  /**
   * Creates and returns a new Query that starts after the provided document
   * (exclusive). The starting position is relative to the order of the query.
   * The document must contain all of the fields provided in the orderBy of
   * this query.
   *
   * @param snapshot The snapshot of the document to start after.
   * @return The created Query.
   */
  startAfter(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that starts after the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to start this query after, in order
   * of the query's order by.
   * @return The created Query.
   */
  startAfter(...fieldValues: any[]): Query;
  startAfter(args: any): Query;

  /**
   * Creates and returns a new Query that ends before the provided document
   * (exclusive). The end position is relative to the order of the query. The
   * document must contain all of the fields provided in the orderBy of this
   * query.
   *
   * @param snapshot The snapshot of the document to end before.
   * @return The created Query.
   */
  endBefore(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that ends before the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to end this query before, in order
   * of the query's order by.
   * @return The created Query.
   */
  endBefore(...fieldValues: any[]): Query;
  endBefore(args: any): Query;

  /**
   * Creates and returns a new Query that ends at the provided document
   * (inclusive). The end position is relative to the order of the query. The
   * document must contain all of the fields provided in the orderBy of this
   * query.
   *
   * @param snapshot The snapshot of the document to end at.
   * @return The created Query.
   */
  endAt(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that ends at the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to end this query at, in order
   * of the query's order by.
   * @return The created Query.
   */
  endAt(...fieldValues: any[]): Query;
  endAt(args: any): Query;

  /**
   * Executes the query and returns the results as a `QuerySnapshot`.
   *
   * @return A Promise that will be resolved with the results of the Query.
   */
  get(): Promise<QuerySnapshot>;
};

export type CollectionReference = Query & {
  get id(): string;

  get path(): string;

  /**
   * Get a `DocumentReference` for a randomly-named document within this
   * collection. An automatically-generated unique ID will be used as the
   * document ID.
   *
   * @return The `DocumentReference` instance.
   */
  doc(): DocumentReference;

  /**
   * Get a `DocumentReference` for the document within the collection at the
   * specified path.
   *
   * @param documentPath A slash-separated path to a document.
   * @return The `DocumentReference` instance.
   */
  doc(documentPath: string): DocumentReference;

  doc(path?: any): DocumentReference;
};

export type DocumentReference = {
  get id(): string;

  get path(): string;

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @return The `CollectionReference` instance.
   */
  collection(collectionPath: string): CollectionReference;

  /**
   * Reads the document referred to by this `DocumentReference`.
   *
   * @return A Promise resolved with a DocumentSnapshot containing the
   * current document contents.
   */
  get(): Promise<DocumentSnapshot>;
};

export type DocumentSnapshot = {
  /** A `DocumentReference` to the document location. */
  readonly ref: DocumentReference;

  /* @internal */
  get wrapped(): firestore.DocumentSnapshot<firestore.DocumentData>;

  /** True if the document exists. */
  get exists(): boolean;

  /**
   * The ID of the document for which this `DocumentSnapshot` contains data.
   */
  get id(): string;

  /**
   * The time the document was created. Not set for documents that don't
   * exist.
   */
  get createTime(): firestore.Timestamp | undefined;

  /**
   * The time the document was last updated (at the time the snapshot was
   * generated). Not set for documents that don't exist.
   */
  get updateTime(): firestore.Timestamp | undefined;

  /**
   * The time this snapshot was read.
   */
  get readTime(): firestore.Timestamp;

  /**
   * Retrieves all fields in the document as an Object. Returns 'undefined' if
   * the document doesn't exist.
   *
   * @return An Object containing all fields in the document.
   */
  data(): firestore.DocumentData | undefined;
};

export type TrackingMode = 'Tracked' | 'Delete' | 'Create' | 'Untracked';

export type DatabaseOp = 'Create' | 'Update' | 'Delete';

export type RepoOp = {
  opType: DatabaseOp;
  doc: { ref: DocumentReference; data: any };
};

export type Message = {
  id: string;
  topic: string;
  timeCreated: Date;
  timeSent: Date;
  data: any;
};

export type EventDTO = {
  id: string;
  topic: string;
  timeCreated: string; //iso8601 zulu date
  timeSent: string; //iso8601 zulu date
  data: any;
};
