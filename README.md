
<p dir="auto">
  <a target="_blank" rel="noopener noreferrer" href="https://app.travis-ci.com/ChrisForeman/firestore-repo">
    <img alt="build-status" src="https://app.travis-ci.com/ChrisForeman/firestore-repo.svg?branch=main"/>
  </a>
</p>
<p align="center">
  <h1 align="center">Firestore Repo</h1>
  <p align="center">
A lightweight framework for implementing the repository pattern via Firestore.
  </p>
</p>

## Introduction

Firestore Repo is a framework aimed at creating business and application code that is implementation-agnostic. 

Advantages to this approach:
• Testable application and business code
• Understandable code
• Help avoid product lock in. Perhaps swap implementation out for a different database product.

## Installation

```sh
npm i firestore-repo
```

## Basic usage
Example: A basic application for managing user tasks. This Service class indirectly depends on Firestore through dependency injection. It could then be used within an express app to build a rest api.
```typescript
class Service {

    private _runTransaction: TransactionBlock

    constructor(factory: UnitOfWorkFactory) {
        this._runTransaction = handler => factory.create(handler)
    }
    
	//Creates a new user Task in firestore.
    createTask(name: string, deadline: Date | undefined, assignedUser: string | undefined): Promise<Task> {
        return this._runTransaction(async uow => {
            const newTask = new Task('someRandomId', name, deadline, assignedUser)
            uow.tasks.add(newTask)
            return newTask
        })
    }
    
	//Retrieves a new user Task in firestore.
    getTask(id: string): Promise<Task> {
        return this._runTransaction(uow => uow.tasks.get(id))
    }
    
	//Updates a user Task in firestore.
    updateTask(id: string, name: string | undefined, deadline: Date | undefined, assignedUser: string | undefined): Promise<Task> {
        return this._runTransaction(async uow => {
            const task = await uow.tasks.get(id)
            if (name !== undefined) {
                task.name = name
            }
            if (deadline && assignedUser) {
                task.assign(assignedUser, deadline)
            }
            return task
        })
    }
	
	//Removes a Task from firestore.
    deleteTask(id: string): Promise<Task> {
        return this._runTransaction(async uow => {
            const task = await uow.tasks.get(id)
            uow.tasks.remove(task)
            return task
        })
    }

}
```