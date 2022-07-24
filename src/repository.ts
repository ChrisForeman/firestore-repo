import { Transaction } from './transaction'
import { TrackingMode, Identifiable } from './types'
import { firestore } from 'firebase-admin'
import { RepoOp } from './types'
import { DocumentReference } from './wrapped'

export class Repository<T extends Identifiable> {

    readonly transaction: Transaction

    private __items: { model: T, mode: TrackingMode }[]

    constructor(transaction: Transaction) {
        this.transaction = transaction
        transaction.addRepo(this)
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
        ref: DocumentReference,
        data: any
    }[] {
        throw new Error('Unimplemented: toDocuments() has not been implemented.')
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