export default class Client {
  #rootUrl = "http://localhost:8000/v1";

  async putScript(name: string, content: string): Promise<void> {
    const body = new FormData();
    body.append("files", new Blob([content]), "worker.js");

    const url = `${this.#rootUrl}/scripts/${name}`;
    const resp = await fetch(url, {
      method: "PUT",
      body,
    });
    console.log(await resp.json());
  }

  async getScripts(): Promise<void> {
    const resp = await fetch(`${this.#rootUrl}/scripts`);
    console.log(await resp.json());
  }

  async deleteScript(name: string): Promise<void> {
    const url = `${this.#rootUrl}/scripts/${name}`;
    const resp = await fetch(url, { method: "DELETE" });
    console.log(await resp.json());
  }

  async putSecret(
    scriptName: string,
    secretName: string,
    value: string,
  ): Promise<void> {
    const data = {
      secrets: {
        [secretName]: value,
      },
    };

    const url = `${this.#rootUrl}/secrets/${scriptName}`;
    const resp = await fetch(url, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: {
        "content-type": "application/json",
      },
    });

    console.log(await resp.json());
  }
}
