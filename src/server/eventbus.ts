import { Script } from "./model.ts";
import { EventEmitter } from "./deps.ts";

export interface ScriptStatusChangedEvent {
  script: Script;
}

export type Events = {
  scriptStatusChanged: [ScriptStatusChangedEvent];
};

class EventBus extends EventEmitter<Events> {}
export default new EventBus();
