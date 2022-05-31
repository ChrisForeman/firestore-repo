import { DbContext } from './db-context'
import { TrackingMode, DatabaseOp, FireDocument, Identifiable } from '../types'
import { firestore } from 'firebase-admin'
import { RepoOp } from './types'

//TODO: Figure out solution to deleting aggregate branches when they are deleted in the aggregate root object.
//Possible solution. Have an item track class that the user has to explicitly track the branches before adding them to the root 
//and then during the toDocuments method, they have to update the item tracker with the new value of the branches from the root.
export class Repository<T extends Identifiable> {

    readonly context: DbContext

    private __items: { model: T, mode: TrackingMode }[]

    constructor(context: DbContext) {
        this.context = context
        context.addRepo(this)
        this.__items = []
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

    protected toDocuments(item: T): {
        ref: firestore.DocumentReference
        data: any
    }[] {
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
    operations(): RepoOp[] {
        const ops: RepoOp[] = []
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