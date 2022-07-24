import { firestore } from "firebase-admin"
import { Repository } from "./repository"


class Task {

    readonly id: string
    private _name: string
    private _deadline?: Date
    private _assignedUserId?: string

    constructor(id: string, name: string, deadline: Date | undefined, assignedUserId: string | undefined) {
        this.id = id
        this._name = name
        this._deadline = deadline ? new Date(deadline) : undefined
        this._assignedUserId = assignedUserId
    }

    get name(): string {
        return this._name
    }

    set name(newValue: string) {
        if (newValue.length === 0) {
            throw new Error('Task name cannot be empty.')
        }
        const maxLength = 100
        if (newValue.length > maxLength) {
            throw new Error(`Task name cannot exceed ${maxLength} characters.`)
        }
        this._name = newValue
    }

    get deadline(): Date | undefined {
        return this._deadline ? new Date(this._deadline) : undefined
    }

    get assignedUserId(): string | undefined {
        return this._assignedUserId
    }

    assign(userId: string, deadline: Date): void {
        const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const day = names[deadline.getDay()]
        if (day === 'Saturday' || day === 'Sunday') {
            throw new Error('Cannot assign a task on the weekend silly!')
        }
        this._assignedUserId = userId
        this._deadline = deadline
    }

}


export interface TaskRepo {

    add(item: Task): void

    remove(item: Task): void

    get(id: string): Promise<Task>

}

export class TaskRepoFirestore extends Repository<Task> implements TaskRepo {

    async get(id: string): Promise<Task> {
        const taskDoc = await this.transaction.collection('tasks').doc(id).get().then(doc => {
            if (!doc.exists) {
                throw new Error(`Task ${id} not found.`)
            }
            return doc
        })
        const task = this._decode(taskDoc.data())
        super.track(task)
        return task
    }

    private _decode(data: any): Task {
        const deadline = (data.deadline as firestore.Timestamp).toDate() //convert b/c domain model uses Date, but firestore uses Timestamp.
        return new Task(data.id, data.name, deadline, data.assignedUserId)
    }
}


interface UnitOfWork {

    tasks: TaskRepo

}

interface UnitOfWorkFactory {

    create<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>

}



class API {

    private _runTransaction: <T>(handler: (uow: UnitOfWork) => Promise<T>) => Promise<T>

    constructor(factory: UnitOfWorkFactory) {
        this._runTransaction = handler => factory.create(handler)
    }

    createTask(name: string, deadline: Date | undefined, assignedUser: string | undefined): Promise<Task> {

        return this._runTransaction(async uow => {

            const newTask = new Task('someRandomId', name, deadline, assignedUser)

            uow.tasks.add(newTask)

            return newTask

        })
    }

    getTask(id: string): Promise<Task> {

        return this._runTransaction(uow => uow.tasks.get(id))

    }

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

    deleteTask(id: string): Promise<Task> {

        return this._runTransaction(async uow => {

            const task = await uow.tasks.get(id)

            uow.tasks.remove(task)

            return task

        })

    }



}