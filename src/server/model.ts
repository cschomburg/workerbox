import { uuid } from "../deps.ts";

export class Script {
  name: string;
  id: string;
  content?: Uint8Array;

  status = "pending";
  updatedAt: Date;

  constructor(name: string) {
    this.name = name;
    this.id = uuid.generate();
    this.updatedAt = new Date();
  }

  nameId(): string {
    return `${this.name}-${this.id.substring(0, 8)}`;
  }
}

export class Secret {
  script: string;
  name: string;
  value?: string;

  constructor(script: string, name: string) {
    this.script = script;
    this.name = name;
  }
}

export class KeyValue {
  namespace: string;
  name: string;
  value?: Uint8Array;

  constructor(namespace: string, name: string) {
    this.namespace = namespace;
    this.name = name;
  }
}
