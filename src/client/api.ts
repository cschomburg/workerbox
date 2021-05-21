export default class Client {
  #rootUrl = "http://localhost:8000/v1";

  async putWorkerScript(name: string, content: string): Promise<void> {
    const body = new FormData();
    body.append("files", new Blob([content]), "worker.js");

    const url = `${this.#rootUrl}/workers/scripts/${name}`;
    const resp = await fetch(url, {
      method: "PUT",
      body,
    });
    console.log(await resp.json());
  }
}
