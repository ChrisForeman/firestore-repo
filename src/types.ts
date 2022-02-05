import { firestore } from 'firebase-admin'

export interface Identifiable {
    id: string
}

export type FireDocument = {
    ref: firestore.DocumentReference
    data: any
}

export type TrackingMode = 'Tracked' | 'Delete' | 'Create' | 'Untracked'

export type DatabaseOp = 'Create' | 'Update' | 'Delete'
