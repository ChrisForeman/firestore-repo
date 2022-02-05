import { DocumentReference, FirestoreMock } from './firestore-mock.test'
import { BaseRepo } from './repository'
import { FireDocument } from './types'
import { UnitOfWorkDefault } from './unit-of-work'

type Customer = {
    id: string
    firstName: string
    lastName: string
    age: number
    verified: boolean
}

class CustomerRepo extends BaseRepo<Customer> {



    protected toDocuments(item: Customer): FireDocument[] {
        return [{ ref: new DocumentReference(`customers/${item.id}`) as any, data: item }]
    }

}

//TODO: Need unit test for 'if transaction runs more than ones the tracker is reset.

describe('', () => {

    describe('', () => {

        it('', async () => {


            const db: any = new FirestoreMock(new Map())

            const uow = new UnitOfWorkDefault(db)

            await uow.commit<CustomerRepo, void>(context => new CustomerRepo(context), (async repo => {

                repo.add({
                    id: 'someID',
                    firstName: 'SomeFirstName',
                    lastName: 'SomeLastName',
                    age: 21,
                    verified: false
                })


            }))



            const map = db.data as Map<string, any>

            map.forEach((v, k) => {
                console.log('DATA', k, v)
            })

        })
    })

})
