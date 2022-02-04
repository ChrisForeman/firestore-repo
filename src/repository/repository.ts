import { firestore } from 'firebase-admin'
import { getDocData } from '../utils'
import { DatabaseContext } from '../context/database-context'

export interface FireDocument {
    ref: firestore.DocumentReference
    data: any
}


export interface Identifiable {
    id: string
}

export type TrackingMode = 'Tracked' | 'Delete' | 'Create' | 'Untracked'

export type DatabaseOp = 'Create' | 'Update' | 'Delete'


//TODO: Figure out solution to deleting aggregate branches when they are deleted in the aggregate root object.
//Possible solution. Have an item track class that the user has to explicitly track the branches before adding them to the root 
//and then during the toDocuments method, they have to update the item tracker with the new value of the branches from the root.
export class BaseRepo<T extends Identifiable> {

    readonly context: DatabaseContext

    private __items: { model: T, mode: TrackingMode }[]

    constructor(context: DatabaseContext) {
        this.context = context
        this.__items = []
    }

    get(id: string): Promise<T> {
        throw new Error('Unimplemented: All subclasses of BaseRepo must implement the get() method.')
    }

    add(item: T): void {
        let i = 0
        for (const curr of this.__items) {
            if (item.id === curr.model.id) {
                if (curr.mode === 'Delete') {
                    this.__items[i].mode = 'Tracked'
                } else if (curr.mode === 'Untracked') {
                    this.__items[i].mode = 'Create'
                }
                return
            }
            i += 1
        }
        this.__items.push({ model: item, mode: 'Create' })
    }

    remove(item: T): void {
        let i = 0
        for (const curr of this.__items) {
            if (item.id === curr.model.id) {
                if (curr.mode === 'Tracked') {
                    this.__items[i].mode = 'Delete'
                } else if (curr.mode === 'Create') {
                    this.__items[i].mode = 'Untracked'
                }
                return
            }
            i += 1
        }
        this.__items.push({ model: item, mode: 'Delete' })
    }

    protected toDocuments(item: T): FireDocument[] {
        throw new Error('Unimplemented: All subclasses of BaseRepo must implement the toDocument() method.')
    }

    /**
     * Do not override. 
     * @param item 
     */
    protected track(item: T): void {
        let i = 0
        for (const curr of this.__items) {
            if (item.id === curr.model.id) {
                this.__items[i].model = item //Just
                return
            }
            i += 1
        }
        this.__items.push({ model: item, mode: 'Tracked' })
    }

    /**
     * Do not override. Used internally.
     * @returns 
     */
    operations(): { opType: DatabaseOp, doc: FireDocument }[] {
        const ops: { opType: DatabaseOp, doc: FireDocument }[] = []
        this.__items.forEach(({ model, mode }) => {
            if (mode === 'Create') {
                this.toDocuments(model).forEach(doc => {
                    ops.push({ opType: 'Create', doc: doc })
                })
            } else if (mode === 'Delete') {
                this.toDocuments(model).forEach(doc => {
                    ops.push({ opType: 'Delete', doc: doc })
                })
            } else if (mode === 'Tracked') {
                this.toDocuments(model).forEach(doc => {
                    ops.push({ opType: 'Update', doc: doc })
                })
            }
        })
        return ops
    }

}



export interface Repository<T extends Identifiable> {

    context: DatabaseContext

    get(id: string): Promise<T>

    create(entity: T): void

    delete(entity: T): void

    getDocuments(): FireDocument[]

}


class TestProduct {
    id: string
    attributes: Record<string, string>
    name: string
    issues: TestIssue[]
    private _vendeeNumber?: string

    constructor(id: string, name: string, attributes: Record<string, string>, issues: TestIssue[], vendeeNumber?: string) {
        this.id = id
        this.attributes = attributes
        this.name = name
        this.issues = issues
        this._vendeeNumber = vendeeNumber
    }

    setAtt(name: string, option: string | undefined) {
        if (option === undefined) {
            if (this.attributes[name] !== undefined) {
                delete this.attributes[name]
            }
        } else {
            this.attributes[name] = option
        }
    }

    ship(orderNumber: string): void {
        if (this._vendeeNumber !== undefined) {
            throw new Error('Cannot ship product that is already shipped.')
        }
        this._vendeeNumber = orderNumber
    }

    returnToBusiness(): void {
        if (this._vendeeNumber === undefined) {
            throw new Error('Cannot return product that is in inventory.')
        }
        this._vendeeNumber = undefined
    }

    get vendeeNumber(): string | undefined {
        return this._vendeeNumber
    }


}

class TestIssue {
    id: string
    name: string
    condition: string

    constructor(id: string, name: string, condition: string) {
        this.id = id
        this.name = name
        this.condition = condition
    }
}


export class ProductRepoTest extends BaseRepo<TestProduct> {

    async get(id: string): Promise<TestProduct> {
        const productDoc = await this.context.getDoc(this.context.db.collection(`test-products`).doc(id))
        const productData = getDocData(productDoc)
        const issues = await Promise.all((productData.issues as string[]).map(name =>
            this.context.getDoc(this.context.db.collection('test-issues').doc(name)).then(doc => ({ id: doc.id, data: getDocData(doc) }))
        ))
        const p = ProductRepoTest.toDomain(productDoc.id, productData, issues.map(i => ProductRepoTest.toDomainIssue(i.id, i.data)))
        this.track(p)
        return p
    }

    toDocuments(item: TestProduct): FireDocument[] {
        const docs: FireDocument[] = []
        docs.push({
            ref: this.context.db.collection(`test-products`).doc(item.id),
            data: ProductRepoTest.toData(item)
        })
        item.issues.forEach(issue => {
            docs.push({
                ref: this.context.db.collection('test-issues').doc(issue.id),
                data: ProductRepoTest.toDataIssue(issue)
            })
        })
        return docs
    }

    static toDomain(id: string, data: any, issues: TestIssue[]): TestProduct {
        return new TestProduct(
            id,
            data.name,
            data.attributes,
            issues,
            data.vendeeNumber
        )
    }

    static toData(product: TestProduct): any {
        return {
            name: product.name,
            attributes: product.attributes,
            issues: product.issues.map(issue => issue.id),
            vendeeNumber: product.vendeeNumber
        }
    }

    static toDomainIssue(id: string, data: any): TestIssue {
        return new TestIssue(
            id,
            data.name,
            data.condition
        )
    }

    static toDataIssue(issue: TestIssue): any {
        return {
            name: issue.name,
            condition: issue.condition
        }
    }


}
