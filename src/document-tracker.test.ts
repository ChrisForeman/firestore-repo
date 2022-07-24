import * as assert from 'assert'
import { DocumentTracker } from './document-tracker'
import { firestore } from 'firebase-admin'

describe('DocumentTracker', () => {


    describe('#track()', () => {

        it(`records the document data read from firestore`, () => {

            const tracker = new DocumentTracker()

            const document = {
                path: 'SomePath',
                data: {
                    stringField: 'someString',
                    boolField: true,
                    numField: 100
                }
            }

            tracker.track(document.path, document.data)

            const changedData = tracker.changedData(document.path, document.data)

            //Should not have changes since the data being set is identical to the data being read.
            const hasChanges = changedData !== undefined
            assert.strictEqual(hasChanges, false)
        })
    })


    describe('#reset()', () => {

        it(`removes all tracked document reads`, () => {

            const tracker = new DocumentTracker()

            const document = {
                path: 'SomePath',
                data: {
                    stringField: 'someString',
                    boolField: true,
                    numField: 100
                }
            }
            tracker.track(document.path, document.data)

            tracker.reset()

            //Only public method we can observe internal state.
            const changedData = tracker.changedData(document.path, document.data)

            const changedFields = Object.keys(changedData)
            const readFields = Object.keys(document.data)

            //Since all reads are removed before tracking changes the amount of fields changed should be equal.
            assert.strictEqual(changedFields.length, readFields.length)

            changedFields.forEach(fieldname => {
                assert.strictEqual(changedData[fieldname], (document as any).data[fieldname])
            })
        })
    })


    describe('#changedData()', () => {

        it(`returns undefined when there are not any fields that should be updated in the document`, () => {

            const tracker = new DocumentTracker()

            const currentTime = new Date().getTime()

            const path: string = 'root-collection'

            const readData: Record<string, any> = {
                stringField: 'someString',
                boolField: true,
                numField: 100,
                dateField: new Date(currentTime),
                timestampField: firestore.Timestamp.fromDate(new Date(currentTime)),
                nestedObject: {
                    stringField: 'someString',
                    boolField: true,
                    numField: 100,
                    dateField: new Date(currentTime),
                    timestampField: firestore.Timestamp.fromDate(new Date(currentTime))
                },
                primitiveArray: ['str1', 'str2', 'str3'],
                objectArray: [
                    {
                        stringField: 'someString1',
                        boolField: false,
                        numField: 200,
                        dateField: new Date(currentTime + 1),
                        timestampField: firestore.Timestamp.fromDate(new Date(currentTime + 1))
                    },
                    {
                        stringField: 'someString2',
                        boolField: true,
                        numField: 100,
                        dateField: new Date(currentTime),
                        timestampField: firestore.Timestamp.fromDate(new Date(currentTime))
                    }
                ],
                nullField: null
            }

            tracker.track(path, readData)

            const writeDate: Record<string, any> = {
                explicitUndefined: undefined, //Won't include in read data, so it should should not be deleted from database.
                stringField: 'someString',
                boolField: true,
                numField: 100,
                dateField: new Date(currentTime),
                timestampField: firestore.Timestamp.fromDate(new Date(currentTime)),
                nestedObject: {
                    stringField: 'someString',
                    boolField: true,
                    numField: 100,
                    dateField: new Date(currentTime),
                    timestampField: firestore.Timestamp.fromDate(new Date(currentTime))
                },
                primitiveArray: ['str1', 'str2', 'str3'],
                objectArray: [
                    {
                        stringField: 'someString1',
                        boolField: false,
                        numField: 200,
                        dateField: new Date(currentTime + 1),
                        timestampField: firestore.Timestamp.fromDate(new Date(currentTime + 1))
                    },
                    {
                        stringField: 'someString2',
                        boolField: true,
                        numField: 100,
                        dateField: new Date(currentTime),
                        timestampField: firestore.Timestamp.fromDate(new Date(currentTime))
                    }
                ],
                nullField: null
            }

            const result = tracker.changedData(path, writeDate)

            assert.strictEqual(result, undefined)
        })

        it(`returns correct update data if primitive field values are different`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                stringField: 'someString',
                boolField: true,
                numField: 100
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                stringField: 'someString',
                boolField: false,
                numField: 100
            }

            const entries = Object.entries(tracker.changedData(path, expected))
            assert.strictEqual(entries.length, 3)
            entries.forEach(([k, v]) => {
                assert.strictEqual(v, expected[k])
            })

        })

        it(`returns correct update data if read field is undefined and null is written`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {

            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                stringField: null
            }

            const entries = Object.entries(tracker.changedData(path, expected))
            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.strictEqual(v, expected[k])
            })

        })

        it(`returns correct update data if nested primitive field values are different`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                objectField: {
                    stringField: 'someString',
                    boolField: false
                },
                objectField2: {
                    stringField: 'someString',
                    boolField: false
                }
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                objectField: {
                    stringField: 'anotherString',
                    boolField: false
                },
                objectField2: {
                    stringField: 'someString',
                    boolField: false
                }
            }

            const entries = Object.entries(tracker.changedData(path, expected))
            assert.strictEqual(entries.length, 2)
            entries.forEach(([k, v]) => {
                assert.deepStrictEqual(v, expected[k])
            })

        })

        it(`only sets fields to delete if they existed in the read data, but not in write data`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                stringField: 'someString',
                boolField: false, //Will be unused b/c won't be explicitly undefined
                numField: 100
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                stringField: undefined, //Explicitly undefined and should be deleted.
                numField: undefined//Explicitly undefined and should be deleted.
            }

            const entries = Object.entries(tracker.changedData(path, expected))
            assert.strictEqual(entries.length, 2)
            entries.forEach(([k, v]) => {
                assert.strictEqual(firestore.FieldValue.delete().isEqual(v as any), true)
            })

        })



        it(`returns data if the nested item was implicitly undefined (deleted)`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                nestedObject: {
                    key1: 'someKey1',
                    key2: 'someKey2'
                }
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                nestedObject: {
                    key1: 'someKey1',
                    //key2: is implicitly undefined so it won't be iterable in the object.
                }
            }

            const entries = Object.entries(tracker.changedData(path, expected))
            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.deepStrictEqual(v, expected[k])
            })

        })

        it(`returns data if the nested read item is null, but the nested write item is a non-null object`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                nestedObject: null
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                nestedObject: {
                    key1: 'someKey1',
                    //key2: is implicitly undefined so it won't be iterable in the object.
                }
            }

            const entries = Object.entries(tracker.changedData(path, expected))

            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.deepStrictEqual(v, expected[k])
            })

        })

        it(`returns data if the nested read item is non-null object, but the nested write item is a null object`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                nestedObject: {
                    key1: 'someKey1'
                }
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                nestedObject: null
            }

            const entries = Object.entries(tracker.changedData(path, expected))

            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.deepStrictEqual(v, expected[k])
            })

        })


        it(`returns undefined if both the nested read and write objects are null`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                nestedObject: null
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                nestedObject: null
            }

            const data = tracker.changedData(path, expected)

            assert.strictEqual(data, undefined)

        })

        it(`returns data if top-level array length was modified`, () => {
            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                arrField: ['str1', 'str2', 'str3']
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                arrField: ['str1', 'str2']
            }

            const entries = Object.entries(tracker.changedData(path, expected))
            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.strictEqual(v, expected[k])
            })

        })

        it(`returns data if nested array was modified`, () => {
            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                nested: {
                    arrField: ['str1', 'str2', 'str3']
                }
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                nested: {
                    arrField: ['str1', 'str2', 'st4']
                }
            }

            const entries = Object.entries(tracker.changedData(path, expected))

            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.strictEqual(v, expected[k])
            })
        })

        it(`returns data if the nested write object contains a new additional key not present in the read nested read object.`, () => {

            const tracker = new DocumentTracker()

            const path: string = 'root-collection'
            const readData: Record<string, any> = {
                nestedObject: {
                    key1: 'value1',
                    key2: 'value2',
                }
            }

            tracker.track(path, readData)

            const expected: Record<string, any> = {
                nestedObject: {
                    key1: 'value1',
                    key2: 'value2',
                    key3: 'value3'
                }
            }

            const entries = Object.entries(tracker.changedData(path, expected))

            assert.strictEqual(entries.length, 1)
            entries.forEach(([k, v]) => {
                assert.deepStrictEqual(v, expected[k])
            })

        })




    })


})
