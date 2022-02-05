import { firestore } from "firebase-admin";
import { DatabaseOp, FireDocument } from "./types";

type Timestamp = firestore.Timestamp
type DocumentData = firestore.DocumentData

export class FirestoreMock {

    private data: Map<string, Record<string, any>>

    constructor(data: Map<string, Record<string, any>>) {
        this.data = data
    }

    doc(documentPath: string): DocumentReference<DocumentData> {
        return new DocumentReference(documentPath, this.data.get(documentPath))
    }

    async runTransaction<T>(updateFunction: (transaction: TransactionMock) => Promise<T>): Promise<T> {
        const transaction = new TransactionMock()
        const promise = await updateFunction(transaction)

        transaction.ops.forEach(({ opType, doc, merge }) => {
            switch (opType) {
                case 'Create':
                    this.createDocument(doc.ref.path, doc.data)
                    break
                case 'Update':
                    this.updateDocument(doc.ref.path, doc.data, merge)
                    break
                case 'Delete':
                    this.deleteDocument(doc.ref.path)
                    break
            }
        })
        return promise
    }

    private createDocument(path: string, data: any): void {
        if (this.data.get(path) !== undefined) {
            throw new Error('Cannot create document because it already exists.')
        }
        this.data.set(path, data)
    }


    private updateDocument(path: string, data: any, merge: boolean): void {
        if (merge) {
            const currentData = this.data.get(path) ?? {}
            Object.entries(data).forEach(([field, value]) => {
                currentData[field] = value
            })
            this.data.set(path, currentData)
        } else {
            this.data.set(path, data)
        }
    }

    private deleteDocument(path: string): void {
        this.data.delete(path)
    }



}

class TransactionMock {

    readonly ops: { opType: DatabaseOp, doc: FireDocument, merge: boolean }[]

    constructor() {
        this.ops = []
    }

    create<T>(documentRef: DocumentReference<T>, data: T): TransactionMock {
        this.ops.push({
            opType: 'Create',
            merge: false,
            doc: {
                ref: documentRef as any,
                data: data
            }
        })
        return this
    }

    set<T>(
        documentRef: DocumentReference<T>,
        data: Partial<T>,
        options: firestore.SetOptions
    ): TransactionMock {
        this.ops.push({
            opType: 'Update',
            merge: options.merge ?? false,
            doc: {
                ref: documentRef as any,
                data: data
            }
        })
        return this
    }


    delete(documentRef: DocumentReference<any>): TransactionMock {
        this.ops.push({
            opType: 'Delete',
            merge: false,
            doc: {
                ref: documentRef as any,
                data: undefined
            }
        })
        return this
    }
}

// export class CollectionReference<T = DocumentData> extends Query<T> {


//     /** The identifier of the collection. */
//     readonly id: string;

//     /**
//      * A reference to the containing Document if this is a subcollection, else
//      * null.
//      */
//     readonly parent: DocumentReference<DocumentData> | null;

//     /**
//      * A string representing the path of the referenced collection (relative
//      * to the root of the database).
//      */
//     readonly path: string;

//     /**
//      * Retrieves the list of documents in this collection.
//      *
//      * The document references returned may include references to "missing
//      * documents", i.e. document locations that have no document present but
//      * which contain subcollections with documents. Attempting to read such a
//      * document reference (e.g. via `.get()` or `.onSnapshot()`) will return a
//      * `DocumentSnapshot` whose `.exists` property is false.
//      *
//      * @return {Promise<DocumentReference[]>} The list of documents in this
//      * collection.
//      */
//     listDocuments(): Promise<Array<DocumentReference<T>>>;

//     /**
//      * Get a `DocumentReference` for a randomly-named document within this
//      * collection. An automatically-generated unique ID will be used as the
//      * document ID.
//      *
//      * @return The `DocumentReference` instance.
//      */
//     doc(): DocumentReference<T>;

//     /**
//      * Get a `DocumentReference` for the document within the collection at the
//      * specified path.
//      *
//      * @param documentPath A slash-separated path to a document.
//      * @return The `DocumentReference` instance.
//      */
//     doc(documentPath: string): DocumentReference<T> {

//     }

// }

export class DocumentReference<T = DocumentData> {

    /**
     * A string representing the path of the referenced document (relative
     * to the root of the database).
     */
    get path(): string {
        return this._path
    }

    private _path: string

    private snapshot: DocumentSnapshot<T>

    constructor(path: string, data?: T) {
        this._path = path
        this.snapshot = new DocumentSnapshot(path, this, data)
    }

    /**
     * Reads the document referred to by this `DocumentReference`.
     *
     * @return A Promise resolved with a DocumentSnapshot containing the
     * current document contents.
     */
    get(): Promise<firestore.DocumentSnapshot<T>> {
        return Promise.resolve(this.snapshot as any)
    }

}

export class DocumentSnapshot<T = DocumentData> {

    private _ref: DocumentReference<T>

    /** True if the document exists. */
    readonly exists: boolean

    private _data?: T

    /** A `DocumentReference` to the document location. */
    get ref(): firestore.DocumentReference<T> {
        return this._ref as any
    }

    constructor(path: string, ref: DocumentReference<T>, data?: T) {
        this._data = data
        this._ref = ref
        this.exists = data !== undefined
    }

    /**
     * Retrieves all fields in the document as an Object. Returns 'undefined' if
     * the document doesn't exist.
     *
     * @return An Object containing all fields in the document.
     */
    data(): T | undefined {
        return this._data
    }
}

export class QuerySnapshot<T = DocumentData> {

    private _docs: QueryDocumentSnapshot<T>[]

    /** An array of all the documents in the QuerySnapshot. */
    get docs(): Array<QueryDocumentSnapshot<T>> {
        return this._docs
    }

    constructor(docs: QueryDocumentSnapshot<T>[]) {
        this._docs = docs
    }
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {

    constructor(path: string, ref: DocumentReference<T>, data: T) {
        super(path, ref, data)
    }

    /** @override */
    data(): T {
        return super.data()!
    }
}


