import { Script } from "./model.ts";
import { EventEmitter } from "../deps.ts";

export interface ScriptPayload {
  script: Script;
}

export interface ScriptNamePayload {
  script: string;
}

export type Events = {
  scriptStatusChanged: [ScriptPayload];
  scriptSecretsChanged: [ScriptNamePayload];
};

export class EventBus extends EventEmitter<Events> {}
