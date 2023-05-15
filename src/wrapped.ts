import { firestore } from 'firebase-admin';
import { DocumentTracker } from './document-tracker';

type QueryConstructorData = {
  query: firestore.Query<firestore.DocumentData>;
  tracker: DocumentTracker;
  trackChanges: boolean;
};

export class Query {
  protected _query: firestore.Query<firestore.DocumentData>;

  protected _tracker: DocumentTracker;

  protected _trackChanges: boolean;

  constructor(data: QueryConstructorData) {
    this._query = data.query;
    this._tracker = data.tracker;
    this._trackChanges = data.trackChanges;
  }

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
  where(
    fieldPath: string | firestore.FieldPath,
    opStr: firestore.WhereFilterOp,
    value: any
  ): Query {
    return new Query({
      query: this._query.where(fieldPath, opStr, value),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

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
  ): Query {
    return new Query({
      query: this._query.orderBy(fieldPath, directionStr),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

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
  limit(limit: number): Query {
    return new Query({
      query: this._query.limit(limit),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

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
  startAt(args: any): Query {
    const snap = args instanceof DocumentSnapshot ? args.wrapped : args;
    return new Query({
      query: this._query.startAt(snap),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

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
  startAfter(args: any): Query {
    const snap = args instanceof DocumentSnapshot ? args.wrapped : args;
    return new Query({
      query: this._query.startAfter(snap),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

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
  endBefore(args: any): Query {
    const snap = args instanceof DocumentSnapshot ? args.wrapped : args;
    return new Query({
      query: this._query.endBefore(snap),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

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
  endAt(args: any): Query {
    const snap = args instanceof DocumentSnapshot ? args.wrapped : args;
    return new Query({
      query: this._query.endAt(snap),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

  /**
   * Executes the query and returns the results as a `QuerySnapshot`.
   *
   * @return A Promise that will be resolved with the results of the Query.
   */
  async get(): Promise<QuerySnapshot> {
    const snap = await this._query.get();
    if (this._trackChanges) {
      snap.docs.forEach((doc) => {
        this._tracker.track(doc.ref.path, doc.data());
      });
    }
    return new QuerySnapshot(this, snap);
  }
}

export class QuerySnapshot {
  private _snapshot: firestore.QuerySnapshot;

  /**
   * The query on which you called `get` or `onSnapshot` in order to get this
   * `QuerySnapshot`.
   */
  readonly query: Query;

  constructor(query: Query, snapshot: firestore.QuerySnapshot) {
    this._snapshot = snapshot;
    this.query = query;
  }

  /** An array of all the documents in the QuerySnapshot. */
  get docs(): Array<QueryDocumentSnapshot> {
    return this._snapshot.docs.map((doc) => new QueryDocumentSnapshot(doc));
  }

  /** The number of documents in the QuerySnapshot. */
  get size(): number {
    return this._snapshot.size;
  }

  /** True if there are no documents in the QuerySnapshot. */
  get empty(): boolean {
    return this._snapshot.empty;
  }

  /** The time this query snapshot was obtained. */
  get readTime(): firestore.Timestamp {
    return this._snapshot.readTime;
  }
}

export class QueryDocumentSnapshot {
  private _snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>;

  constructor(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
    this._snapshot = snapshot;
  }

  /**
   * The ID of the document for which this `DocumentSnapshot` contains data.
   */
  get id(): string {
    return this._snapshot.id;
  }

  /**
   * The time this snapshot was read.
   */
  get readTime(): firestore.Timestamp {
    return this._snapshot.readTime;
  }

  /**
   * The time the document was created.
   */
  get createTime(): firestore.Timestamp {
    return this._snapshot.createTime;
  }

  /**
   * The time the document was last updated (at the time the snapshot was
   * generated).
   */
  get updateTime(): firestore.Timestamp {
    return this._snapshot.updateTime;
  }

  /**
   * Retrieves all fields in the document as an Object.
   *
   * @override
   * @return An Object containing all fields in the document.
   */
  data(): firestore.DocumentData {
    return this._snapshot.data();
  }
}

type CollectionReferenceConstructorData = {
  ref: firestore.CollectionReference;
  tracker: DocumentTracker;
  trackChanges: boolean;
};

export class CollectionReference extends Query {
  private _ref: firestore.CollectionReference;

  constructor(data: CollectionReferenceConstructorData) {
    super({ query: data.ref, tracker: data.tracker, trackChanges: data.trackChanges });
    this._ref = data.ref;
  }

  get id(): string {
    return this._ref.id;
  }

  get path(): string {
    return this._ref.path;
  }

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

  doc(path?: any): DocumentReference {
    const ref = path === undefined ? this._ref.doc() : this._ref.doc(path);
    return new DocumentReference({ ref, tracker: this._tracker, trackChanges: this._trackChanges });
  }
}

type DocumentReferenceConstructorData = {
  ref: firestore.DocumentReference<firestore.DocumentData>;
  tracker: DocumentTracker;
  trackChanges: boolean;
};

export class DocumentReference {
  private _ref: firestore.DocumentReference<firestore.DocumentData>;

  private _tracker: DocumentTracker;

  protected _trackChanges: boolean;

  constructor(data: DocumentReferenceConstructorData) {
    this._ref = data.ref;
    this._tracker = data.tracker;
    this._trackChanges = data.trackChanges;
  }

  get id(): string {
    return this._ref.id;
  }

  get path(): string {
    return this._ref.path;
  }

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @return The `CollectionReference` instance.
   */
  collection(collectionPath: string): CollectionReference {
    return new CollectionReference({
      ref: this._ref.collection(collectionPath),
      tracker: this._tracker,
      trackChanges: this._trackChanges,
    });
  }

  /**
   * Reads the document referred to by this `DocumentReference`.
   *
   * @return A Promise resolved with a DocumentSnapshot containing the
   * current document contents.
   */
  async get(): Promise<DocumentSnapshot> {
    const doc = await this._ref.get();
    if (this._trackChanges) {
      this._tracker.track(doc.ref.path, doc.data());
    }
    return new DocumentSnapshot(this, doc);
  }
}

export class DocumentSnapshot {
  private _wrapped: firestore.DocumentSnapshot<firestore.DocumentData>;

  /** A `DocumentReference` to the document location. */
  readonly ref: DocumentReference;

  constructor(
    ref: DocumentReference,
    snapshot: firestore.DocumentSnapshot<firestore.DocumentData>
  ) {
    this.ref = ref;
    this._wrapped = snapshot;
  }

  /* @internal */
  get wrapped(): firestore.DocumentSnapshot<firestore.DocumentData> {
    return this._wrapped;
  }

  /** True if the document exists. */
  get exists(): boolean {
    return this._wrapped.exists;
  }

  /**
   * The ID of the document for which this `DocumentSnapshot` contains data.
   */
  get id(): string {
    return this._wrapped.id;
  }

  /**
   * The time the document was created. Not set for documents that don't
   * exist.
   */
  get createTime(): firestore.Timestamp | undefined {
    return this._wrapped.createTime;
  }

  /**
   * The time the document was last updated (at the time the snapshot was
   * generated). Not set for documents that don't exist.
   */
  get updateTime(): firestore.Timestamp | undefined {
    return this._wrapped.updateTime;
  }

  /**
   * The time this snapshot was read.
   */
  get readTime(): firestore.Timestamp {
    return this._wrapped.readTime;
  }

  /**
   * Retrieves all fields in the document as an Object. Returns 'undefined' if
   * the document doesn't exist.
   *
   * @return An Object containing all fields in the document.
   */
  data(): firestore.DocumentData | undefined {
    return this._wrapped.data();
  }
}
