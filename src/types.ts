import { DocumentReference } from './wrapped';

export interface Identifiable {
  id: string;
}

export type TrackingMode = 'Tracked' | 'Delete' | 'Create' | 'Untracked';

export type DatabaseOp = 'Create' | 'Update' | 'Delete';

export type RepoOp = {
  opType: DatabaseOp;
  doc: { ref: DocumentReference; data: any };
};

export type Message = {
  id: string;
  topic: string;
  timeCreated: Date;
  timeSent: Date;
  data: any;
};

export type EventDTO = {
  id: string;
  topic: string;
  timeCreated: string; //iso8601 zulu date
  timeSent: string; //iso8601 zulu date
  data: any;
};
