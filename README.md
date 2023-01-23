<p align="center">
  <h1 align="center">Firestore Repo</h1>
  <p align="center">
A lightweight framework for implementing the repository pattern via Firestore.
  </p>
</p>

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

### Repository

Types
Implementation

### Unit of Work

Types
Implementation
& Factory

### Service Class

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
