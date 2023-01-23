<p align="center">
  <h1 align="center">Firestore Repo</h1>
  <p align="center">
A lightweight framework for implementing the repository pattern via Firestore.
  </p>
</p>

# Table of contents

adsfasd

- [Table of contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation](#installation)
  - [Getting Started](#getting-started)
    - [Domain Model](#domain-model)
    - [Repository](#repository)
    - [Unit of Work](#unit-of-work)
    - [Service Class](#service-class)
    - [Express](#express)
  - [Eventual Consistency](#eventual-consistency)
    - [Create the outbox](#create-the-outbox)
    - [Using the OutboxWorker class](#using-the-outboxworker-class)

## Introduction

Firestore Repo is a framework aimed at creating implementation-agnostic business and application code for Firestore projects. It facilitates implementation of the Unit of Work, Repository, and Outbox patterns.

Advantages to this approach:
• Testable application and business code
• Enforces the the business rules and prevents them from being broken while handling the data retrieved from the database.
• Easy implementation for an eventual consistent application when using in conjunction with Cloud Functions and Cloud PubSub.
• Helps avoid product lock in where one can swap implementation out for a different database technology without affecting the application implementation or unit tests.
• Understandable code

Aspects of this package
• Unit of Work
• Repositories
• Outbox messaging via PubSub and Cloud Functions

## Installation

```sh
npm i firestore-repo
```

## Getting Started

Although flexibility in testing and functionality extension are some pros to using this pattern, the trade off being relatively more steps in initially getting the application running.

### Domain Model

This application will be a task management system and will need a domain model to represent those tasks and operations that can be performed them.
Normally it makes sense to create the Domain model as a class so it can be properly encapsulated, but for simplicity a type will suffice.
The only limitation on the domain model is that it must have a property `id:string` to identify itself uniquely among all other records.

```typescript
type Task = {
  id: string;
  timeCreated: Date;
  title?: string;
  description?: string;
  status: string;
  assignedTo?: string;
  events: { description: string; time: Date; invoker: string }[];
};
```

### Repository

The type of the repository must be defined to keep the code unit testable.
The repository will act like a collection where Tasks can be add, removed, and retrieved.

```typescript
type TaskRepository = {
  add(item: Task): void;
  remove(item: Task): void;
  get(id: string): Promise<Task>;
};
```

The Repository can now be implemented using the Firebase Admin SDK and this package's Repository class.
The Repository superclass already implements `#add()` and `#remove()` so all that is left is `#get()`.

```typescript
class FirestoreTaskRepository extends Repository implements TaskRepository {
  readonly fs: admin.firestore;

  constructor(fs: admin.firestore.Firestore) {
    this.fs = fs;
  }

  get(id: string): Promise<Task> {
    if (!id) {
      throw Error('Task id cannot be empty.');
    }
    const doc = await this.fs.collection('tasks').doc(id).get();
    const task = this._decode(doc);
    // This method must be called on every domain model that is retrieved from the database.
    // If a Firestore query is used, then every domain model constructed from the query must be tracked.
    super.track(task);
    return task;
  }
}
```

### Unit of Work

The Unit of Work is an overglorified typed transaction that allows one to perform some work on the database atomically. Under the hood it's going to use a Firestore transaction.

Types
Implementation
& Factory

### Service Class

The service class is the driver of the app. It provides all the functionality that can be executed. It will depend on the unit of work to
Create the app service class which will be injected with the unit of work factory
Add a method in the service class

### Express

## Eventual Consistency

capabilities to the app.

Now that the basic app is functional, adding capabilities for integrating with external services via eventual consistency is relatively easy.

### Create the outbox

Create the type for the outbox, write its implementation, and implement the outbox in the service method.

### Using the OutboxWorker class

Create a Firebase cloud function project and use the OutboxWorker class.
