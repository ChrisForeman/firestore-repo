import { firestore } from 'firebase-admin';

/**
 * This class tracks documents when they are read and can be used to determine if a document has changed since it has been read last.
 */
export class DocumentTracker {
  /**
   * A map where its keys are associated with a document's path and the values are the document's data.
   */
  private reads: Map<string, any>;

  constructor() {
    this.reads = new Map<string, any>();
  }

  track(path: string, data: any): void {
    console.log('Track', path);
    this.reads.set(path, data);
  }

  reset(): void {
    this.reads = new Map<string, any>();
  }

  changedData(path: string, data: Record<string, any>): any {
    const readData = this.reads.get(path) ?? {};
    return this.getChanges(readData, data);
  }

  private getChanges(
    readData: Record<string, any>,
    writeData: Record<string, any>
  ): Record<string, any> | undefined {
    const result: Record<string, any> = {};
    let hasChange = false;
    for (const key in writeData) {
      const readVal = readData[key];
      const writeVal = writeData[key];
      if (writeVal === undefined) {
        if (readVal !== undefined) {
          result[key] = firestore.FieldValue.delete();
          hasChange = true;
        }
      } else {
        if (this.hasNestedChange(readVal, writeVal)) {
          hasChange = true;
        }
        result[key] = writeVal;
      }
    }
    return hasChange ? result : undefined;
  }

  //TODO: Support Gepoints and other items
  private hasNestedChange(readField: any, writeField: any): boolean {
    if (this.isDateType(readField) && this.isDateType(writeField)) {
      const readTime = this.getTimeValue(readField);
      const writeTime = this.getTimeValue(writeField);
      return readTime !== writeTime;
    } else if (Array.isArray(readField) && Array.isArray(writeField)) {
      if (readField.length !== writeField.length) {
        return true;
      }
      let i = 0;
      while (i < readField.length) {
        if (this.hasNestedChange(readField[i], writeField[i])) {
          return true;
        }
        i += 1;
      }
      return false;
    } else if (readField === null || writeField === null) {
      return readField !== writeField; //null != null
    } else if (typeof readField === 'object' && typeof writeField === 'object') {
      //Because its a decent chance a nested object might use the 'delete' method
      //Also it means we are using the field
      const keys: Set<string> = new Set<string>(
        Object.keys(readField).concat(Object.keys(writeField))
      );
      let hasNestedChange = false;
      keys.forEach((key) => {
        if (this.hasNestedChange(readField[key], writeField[key])) {
          hasNestedChange = true;
        }
      });
      return hasNestedChange;
    } else {
      return readField !== writeField;
    }
  }

  private isDateType(union: any): boolean {
    return union instanceof Date || union instanceof firestore.Timestamp;
  }

  private getTimeValue(union: Date | firestore.Timestamp): number {
    if (union instanceof firestore.Timestamp) {
      return union.toDate().getTime();
    } else {
      return union.getTime();
    }
  }
}
