import { firestore } from "firebase-admin"
import { DatabaseContext } from "./database-context"
import { ReadonlyContext } from "./readonly-context"
import { TransactionContext } from "./transaction-context"
import { BaseRepo } from "./repository"


//This interface is designed to update multipe aggregate roots which is a bad practice: https://stackoverflow.com/a/42104503/6738247
//However, it saves me time and allows me to reuse domain models in different contexts.
//I don't understand the advantages to conform to this rule such as: modeling the products to be shipped and a shipping order into 1 AR.

export interface UnitOfWork {

    readonly<T extends BaseRepo<any>>(repoRegistration: (context: DatabaseContext) => T): T

    commit<T extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => T, work: (repos: T) => Promise<W>): Promise<W>

    commit<T1 extends BaseRepo<any>, T2 extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => [T1, T2], work: (repos: [T1, T2]) => Promise<W>): Promise<W>

    commit<T1 extends BaseRepo<any>, T2 extends BaseRepo<any>, T3 extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => [T1, T2, T3], work: (repos: [T1, T2, T3]) => Promise<W>): Promise<W>

    commit<T1 extends BaseRepo<any>, T2 extends BaseRepo<any>, T3 extends BaseRepo<any>, T4 extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => [T1, T2, T3, T4], work: (repos: [T1, T2, T3, T4]) => Promise<W>): Promise<W>
}



export type ContextType = 'Default' | 'Transaction'

export class UnitOfWorkDefault {

    private db: firestore.Firestore

    constructor(db: firestore.Firestore) {
        this.db = db
    }

    readonly<T extends BaseRepo<any>>(repoRegistration: (context: DatabaseContext) => T): T {
        return repoRegistration(this.getContext('Default'))
    }

    private getContext(contextType: ContextType): DatabaseContext {
        switch (contextType) {
            case 'Default':
                return new ReadonlyContext(this.db)
            case 'Transaction':
                return new TransactionContext(this.db)
            default:
                throw new Error(`Invalid context type: ${contextType}.`)
        }
    }

    async commit<T extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => T, work: (repos: T) => Promise<W>): Promise<W>

    async commit<T1 extends BaseRepo<any>, T2 extends BaseRepo<any>, T3 extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => [T1, T2, T3], work: (repos: [T1, T2, T3]) => Promise<W>): Promise<W>

    async commit<T1 extends BaseRepo<any>, T2 extends BaseRepo<any>, W>(repoRegistration: (context: DatabaseContext) => [T1, T2], work: (repos: [T1, T2]) => Promise<W>): Promise<W>

    async commit<W>(repoRegistration: (context: DatabaseContext) => any, work: (repos: any) => Promise<W>): Promise<W> {

        const context = this.getContext('Transaction')

        const union = repoRegistration(context)

        if (context instanceof TransactionContext) {
            return context.commit(union, work)
        } else if (context instanceof ReadonlyContext) {
            const workResult = await work(union)
            await context.commit(union)
            return workResult
        } else {
            throw new Error('Unsupported context')
        }

    }

}
