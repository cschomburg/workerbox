import { uuid } from "../deps.ts";

export class Script {
  name: string;
  id: string;
  content?: Uint8Array;

  status = "pending";
  url = "";

  constructor(name: string) {
    this.name = name;
    this.id = uuid.generate();
  }

  nameId(): string {
    return `${this.name}-${this.id.substring(0, 8)}`;
  }
}
