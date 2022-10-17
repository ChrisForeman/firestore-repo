import { DBContext } from './db-context';
import { Transaction } from './transaction';
import { TrackingMode, Identifiable } from './types';
import { RepoOp } from './types';
import { DocumentReference } from './wrapped';

export class Repository<T extends Identifiable> {
  readonly context: DBContext;

  private __items: { model: T; mode: TrackingMode }[];

  constructor(transaction: Transaction) {
    this.context = transaction.context;
    this.__items = [];
    transaction.addRepo(this);
  }

  add(item: T): void {
    let i = 0;
    for (const curr of this.__items) {
      if (item.id === curr.model.id) {
        if (curr.mode === 'Delete') {
          this.__items[i].mode = 'Tracked';
        } else if (curr.mode === 'Untracked') {
          this.__items[i].mode = 'Create';
        }
        return;
      }
      i += 1;
    }
    this.__items.push({ model: item, mode: 'Create' });
  }

  remove(item: T): void {
    let i = 0;
    for (const curr of this.__items) {
      if (item.id === curr.model.id) {
        if (curr.mode === 'Tracked') {
          this.__items[i].mode = 'Delete';
        } else if (curr.mode === 'Create') {
          this.__items[i].mode = 'Untracked';
        }
        return;
      }
      i += 1;
    }
    this.__items.push({ model: item, mode: 'Delete' });
  }

  protected async toDocuments(item: T): Promise<
    {
      ref: DocumentReference;
      data: any;
    }[]
  > {
    throw new Error('Unimplemented: toDocuments() has not been implemented.');
  }

  /**
   * Do not override.
   * @param item
   */
  protected track(item: T): void {
    let i = 0;
    for (const curr of this.__items) {
      if (item.id === curr.model.id) {
        this.__items[i].model = item; //Just
        return;
      }
      i += 1;
    }
    this.__items.push({ model: item, mode: 'Tracked' });
  }

  /**
   * Do not override. Used internally.
   * @returns
   */
  async operations(): Promise<RepoOp[]> {
    const ops: RepoOp[] = [];
    await Promise.all(
      this.__items.map(async ({ model, mode }) => {
        const docs = await this.toDocuments(model);
        if (mode === 'Create') {
          docs.forEach((doc) => {
            ops.push({ opType: 'Create', doc: doc });
          });
        } else if (mode === 'Delete') {
          docs.forEach((doc) => {
            ops.push({ opType: 'Delete', doc: doc });
          });
        } else if (mode === 'Tracked') {
          docs.forEach((doc) => {
            ops.push({ opType: 'Update', doc: doc });
          });
        }
      })
    );
    return ops;
  }
}
