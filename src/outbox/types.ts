import { firestore } from "firebase-admin"


export type Event = {
    id: string //UUID
    topic: string
    timeCreated: Date
    timeSent?: Date
    sentToBus: boolean
    data: any
}


export type EventSchema = {
    id: string //UUID
    topic: string
    timeCreated: firestore.Timestamp
    timeSent?: firestore.Timestamp
    sentToBus: boolean
    data: any
}