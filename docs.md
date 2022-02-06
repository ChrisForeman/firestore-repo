
### Domain Driven Design

This package is designed to encourage focus on the domain rather than how it is persisted in Firestore.

Consider building a game that requires a feature which allows a user to trade an item to another user. 

However there are some business rules involved in trading items:
1. User can have an item with a minLevel higher than their own level.
2. The user can't trade an item they don't have.


```typescript
type Item = {
    name: string
    minLevel: number
}

class User {

    readonly id: string

    private _currLevel: number

    private _inventory: Map<string, Item[]>


    constructor(id: string, currLevel: number, inventory: Map<string, Item[]>) {
        this.id = id
        this._currLevel = currLevel
        this._inventory = inventory
    }

    get currentLevel(): number {
        return this._currLevel
    }

    get inventory(): Item[] {
        const arr: Item[] = []
        this._inventory.forEach((v, _) => {
            v.forEach(item => arr.push(item))
        })
        return arr
    }

    addItem(item: Item): void {
        if (item.minLevel > this._currLevel) {
            throw new Error(`User must be level ${item.minLevel} to own this item`)
        }
        const items = this._inventory.get(item.name) ?? []
        items.push(item)
        this._inventory.set(item.name, items)
    }

    removeItem(name: string): Item {
        const items = this._inventory.get(name) ?? []
        if (items.length === 0) {
            throw new Error('User does not have one to trade')
        }
        const item = items.pop()! //Safe force unwrap
        this._inventory.set(name, items)
        return item
    }

}
```

### Creating a Repo

The `BaseRepo<T>` class should be subclassed for any domain model that needs to be persisted in Firestore.

Has methods (Do not override):
`.addItem()`: A new item will be created in Firestore.
`.removeItem()`: An existing item will be removed from the repo and if it exists in Firestore it will be deleted.

Since the User model has been defined the UserRepo can be created.

```typescript
class UserRepo extends BaseRepo<User> {

}
```

All the following code will go inside the UserRepo class

When subclassing the BaseRepo it is required to override the `.toDocuments()` method. The method returns an array of FireDocuments to allow a Domain model to be persisted accross multiple documents in Firestore if desired. However in this example, the User model will be stored/updated in a single document so only one item sholuld be in the returned array. Each FireDocument contains the reference and data to set in the document. We are going to store our User models in the `users` collection under their id, however we need to make a mapping function such as `.toSchemaUser()` to convert our User model to the schema of how it will be persisted in firestore.


```typescript
protected toDocuments(item: User): FireDocument[] {
    return [{ 
        ref: this.context.db.collection('users').doc(item.id), data: this.toSchemaUser(item) 
    }]
}


private toSchemaUser(user: User): any {
    return {
        id: user.id,
        currLevel: user.currentLevel,
        inventory: user.inventory.map(item => item.name)
    }
}
```

At this point the repository should be able to add and remove models from Firestore, however there are a few more steps to take before models can be retrieved from Firestore.

First we need to make another mapping function (opposite of `.toSchemaUser`) called: `.toDomainuser()`. This will allow the repo to instantiate a new model from the data retrieved from Firestore.

```typescript 
private toDomainUser(id: string, data: any, items: Item[]): User {
    const map = new Map<string, Item[]>()
    items.forEach(item => {
        const items = map.get(item.name) ?? []
        items.push(this.toDomainItem(item))
        map.set(item.name, items)
    })
    return new User(
        id,
        data.currLevel,
        map
    )
}
```

The final step is to create a method for getting data. This part is pretty flexible in how you implement it. Perhaps make a query method that gets allo users by some field or a `.getById()` method. Each repo has a `context` property that can be used to access the firestore admin sdk to get, query, and reference documents. Each User will also contain aggregates such as an items collection to represent their inventory.

NOTE: For any method that retrieves a model from Firestore, it is required to call the `.track(Item)` method on each model returned or else changes to the item will not be updated in Firestore.

NOTE: In most cases, you should not use the `.get()` method on references and instead, pass the ref to the `context.getDoc(ref)` or `context.queryDocs(query)`.

```typescript 
get(id: string): Promise<User> {
    const ref = this.context.db.collection('users').doc(id)
    return this.context.getDoc(ref).then(async doc => {
        if (doc.exists) {
            const itemNames = doc.data()!.inventory as string[]
            const items = await this.getItems(itemNames)
            const user = this.toDomainUser(doc.id, doc.data(), items)
            this.track(user)
            return user
        } else {
            throw new Error('user not found')
        }
    })
}

private getItems(names: string[]): Promise<Item[]> {
    return Promise.all(names.map(name => {
        const ref = this.context.db.collection('items').doc(name)
        return this.context.getDoc(ref).then(doc => {
            if (doc.exists) {
                return this.toDomainItem(doc.data()!)
            } else {
                throw new Error(`Item: ${name} not found`)
            }
        })
    }))
}
```

### Unit Of Work 

Now that the repo is completed we can use a UnitOfWork instance in tandem with the UserRepo to perform work on Firstore.

Methods:

`.commit<Repo, ReturnType>()`: Creates a transaction context

This method should be used if there is business logic involved with the database to avoid compromising data integrity when multiple users are concurrently working with the same documents. This context uses the Firebase Admin `.runTransaction()` method under the hood.

NOTE: The generics of the method may need to be explicitly set or the type-checking will throw an error.

The method takes two parameters:
1: A closure that passes in the context which returns either a single repo or an array or repos.
2: A work closure that passes in the instantiated repos and allows you to return any type.

NOTE: Just like the Firebase `.runTransction()` closure can execute more that once if a transaction fails, this can too so please look at the best practices in the Firestore transaction documentation. 


```typescript
const db = new admin.firestore.Firestore()

const data = {
    userAId: 'userA',
    userBId: 'userB',
    userATradeItems: ['gold-wheels'],
    userBTradeItems: []
}

await new UnitOfWorkDefault(db).commit<UserRepo, [User, User]>(context => new UserRepo(context), async userRepo => {

    //Get the users making the trade
    const [userA, userB] = await Promise.all([
        userRepo.get(data.userAId),
        userRepo.get(data.userBId)
    ])

    //Transfer items: userB => userA.
    data.userATradeItems.forEach(name => {
        const item = userA.removeItem(name)
        userB.addItem(item)
    })

    //Transfer items: userA => userB.
    data.userBTradeItems.forEach(name => {
        const item = userB.removeItem(name)
        userA.addItem(item)
    })

    return [userA, userB]

}).then(([userA, userB]) => {
    console.log('Trade result saved to firestore!')
    console.log(`UserA inventory: ${userA.inventory}`)
    console.log(`UserB inventory: ${userB.inventory}`)
})
```


After putting it all together you should be able to keep you domain logic separate from database implementation.