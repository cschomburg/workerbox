export interface FetchUpstream {
  fetch(scriptId: string, request: Request): Promise<Response>;
}
