export class KVNamespace {
  #name: string;

  constructor(name: string) {
    this.#name = name;
  }

  put(key: string, value: string | ArrayBuffer): Promise<void> {
  }
}
