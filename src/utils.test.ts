import * as assert from 'assert'
import { getDocData } from './utils'


describe(`Utils`, () => {


    describe(`#getDocData()`, () => {


        it(`throws if the document does not exist`, () => {

            const document: any = {
                exists: false,
                ref: { path: 'somePath' },
                data: () => undefined
            }

            assert.throws(
                () => getDocData(document),
                new Error(`Document at:${document.ref.path} doesn't exist.`)
            )

        })

        it(`returns the document data if the document does exist`, () => {

            const document: any = {
                exists: true,
                ref: { path: 'somePath' },
                data: () => ({
                    someStr: 'someStr',
                    someBool: false,
                    someNum: 1234
                })
            }

            const data = getDocData(document)

            Object.entries(document.data).forEach(([fieldName, fieldValue]) => {
                const actual = data[fieldName]
                assert.strictEqual(actual, fieldValue)
            })

        })


    })
})