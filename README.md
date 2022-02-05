
A small framework for implementing the repository pattern using Firestore.




## Example 

```typescript
const db = new admin.firestore.Firestore()

const data = {
    userAId: 'userA',
    userBId: 'userB',
    userATradeItems: ['gold-wheels'],
    userBTradeItems: []
}

await new Transaction(db).commit<UserRepo, [User, User]>(context => new UserRepo(context), async userRepo => {

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