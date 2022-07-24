import { firestore } from "firebase-admin";
import { DocumentTracker } from "./document-tracker";


export class Query {

    protected _query: firestore.Query<firestore.DocumentData>

    protected _tracker: DocumentTracker

    constructor(query: firestore.Query<firestore.DocumentData>, tracker: DocumentTracker) {
        this._query = query
        this._tracker = tracker
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
        return new Query(this._query.where(fieldPath, opStr, value), this._tracker)
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
        return new Query(this._query.orderBy(fieldPath, directionStr), this._tracker)
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
        return new Query(this._query.limit(limit), this._tracker)
    }

    /**
     * Executes the query and returns the results as a `QuerySnapshot`.
     *
     * @return A Promise that will be resolved with the results of the Query.
     */
    get(): Promise<QuerySnapshot> {
        return this._query.get().then(snap => {
            snap.docs.forEach(doc => {
                this._tracker.track(doc.ref.path, doc.data())
            })
            return new QuerySnapshot(this, snap)
        })
    }
}

class QuerySnapshot {

    private _snapshot: firestore.QuerySnapshot

    /**
     * The query on which you called `get` or `onSnapshot` in order to get this
     * `QuerySnapshot`.
     */
    readonly query: Query

    constructor(query: Query, snapshot: firestore.QuerySnapshot) {
        this._snapshot = snapshot
        this.query = query
    }

    /** An array of all the documents in the QuerySnapshot. */
    get docs(): Array<QueryDocumentSnapshot> {
        return this._snapshot.docs.map(doc => new QueryDocumentSnapshot(doc))
    }

    /** The number of documents in the QuerySnapshot. */
    get size(): number {
        return this._snapshot.size
    }

    /** True if there are no documents in the QuerySnapshot. */
    get empty(): boolean {
        return this._snapshot.empty
    }

    /** The time this query snapshot was obtained. */
    get readTime(): firestore.Timestamp {
        return this._snapshot.readTime
    }

}

class QueryDocumentSnapshot {

    private _snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>

    constructor(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
        this._snapshot = snapshot
    }

    /**
     * The ID of the document for which this `DocumentSnapshot` contains data.
     */
    get id(): string {
        return this._snapshot.id
    }

    /**
     * The time this snapshot was read.
     */
    get readTime(): firestore.Timestamp {
        return this._snapshot.readTime
    }

    /**
     * The time the document was created.
     */
    get createTime(): firestore.Timestamp {
        return this._snapshot.createTime
    }

    /**
     * The time the document was last updated (at the time the snapshot was
     * generated).
     */
    get updateTime(): firestore.Timestamp {
        return this._snapshot.updateTime
    }

    /**
     * Retrieves all fields in the document as an Object.
     *
     * @override
     * @return An Object containing all fields in the document.
     */
    data(): firestore.DocumentData {
        return this._snapshot.data()
    }

}

export class CollectionReference extends Query {

    private _ref: firestore.CollectionReference

    constructor(ref: firestore.CollectionReference, tracker: DocumentTracker) {
        super(ref, tracker)
        this._ref = ref
    }

    get id(): string {
        return this._ref.id
    }

    get path(): string {
        return this._ref.path
    }

    /**
    * Get a `DocumentReference` for a randomly-named document within this
    * collection. An automatically-generated unique ID will be used as the
    * document ID.
    *
    * @return The `DocumentReference` instance.
    */
    doc(): DocumentReference

    /**
     * Get a `DocumentReference` for the document within the collection at the
     * specified path.
     *
     * @param documentPath A slash-separated path to a document.
     * @return The `DocumentReference` instance.
     */
    doc(documentPath: string): DocumentReference

    doc(path?: any): DocumentReference {
        if (path === undefined) {
            return new DocumentReference(this._ref.doc(), this._tracker)
        } else {
            return new DocumentReference(this._ref.doc(path), this._tracker)
        }
    }


}

export class DocumentReference {

    private _ref: firestore.DocumentReference<firestore.DocumentData>

    private _tracker: DocumentTracker

    constructor(ref: firestore.DocumentReference<firestore.DocumentData>, tracker: DocumentTracker) {
        this._ref = ref
        this._tracker = tracker
    }

    get id(): string {
        return this._ref.id
    }

    get path(): string {
        return this._ref.path
    }

    /**
     * Gets a `CollectionReference` instance that refers to the collection at
     * the specified path.
     *
     * @param collectionPath A slash-separated path to a collection.
     * @return The `CollectionReference` instance.
     */
    collection(collectionPath: string): CollectionReference {
        return new CollectionReference(this._ref.collection(collectionPath), this._tracker)
    }

    /**
     * Reads the document referred to by this `DocumentReference`.
     *
     * @return A Promise resolved with a DocumentSnapshot containing the
     * current document contents.
     */
    get(): Promise<DocumentSnapshot> {
        return this._ref.get().then(doc => {
            this._tracker.track(doc.ref.path, doc.data())
            return new DocumentSnapshot(this, doc)
        })
    }

}

class DocumentSnapshot {

    /** True if the document exists. */
    readonly exists: boolean;

    /** A `DocumentReference` to the document location. */
    readonly ref: DocumentReference;

    /**
     * The ID of the document for which this `DocumentSnapshot` contains data.
     */
    readonly id: string;

    /**
     * The time the document was created. Not set for documents that don't
     * exist.
     */
    readonly createTime?: firestore.Timestamp;

    /**
     * The time the document was last updated (at the time the snapshot was
     * generated). Not set for documents that don't exist.
     */
    readonly updateTime?: firestore.Timestamp;

    /**
     * The time this snapshot was read.
     */
    readonly readTime: firestore.Timestamp;

    private _data: firestore.DocumentData | undefined

    constructor(ref: DocumentReference, snapshot: firestore.DocumentSnapshot<firestore.DocumentData>) {

        this.exists = snapshot.exists
        this.ref = ref
        this.id = snapshot.id
        this.createTime = snapshot.createTime
        this.updateTime = snapshot.updateTime
        this.readTime = snapshot.readTime
    }


    /**
     * Retrieves all fields in the document as an Object. Returns 'undefined' if
     * the document doesn't exist.
     *
     * @return An Object containing all fields in the document.
     */
    data(): firestore.DocumentData | undefined {
        return this._data
    }
}

