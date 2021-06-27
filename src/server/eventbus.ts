import { Script } from "./model.ts";
import { EventEmitter } from "../deps.ts";

export interface ScriptStatusChangedEvent {
  script: Script;
}

export type Events = {
  scriptStatusChanged: [ScriptStatusChangedEvent];
};

export class EventBus extends EventEmitter<Events> {}
