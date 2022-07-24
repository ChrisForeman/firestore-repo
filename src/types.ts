import { DocumentReference } from "./wrapped"

export interface Identifiable {
    id: string
}

export type TrackingMode = 'Tracked' | 'Delete' | 'Create' | 'Untracked'

export type DatabaseOp = 'Create' | 'Update' | 'Delete'

export type RepoOp = {
    opType: DatabaseOp,
    doc: { ref: DocumentReference, data: any }
}