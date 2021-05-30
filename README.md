# workerbox

Small selfhosted environment to deploy Service Worker-like functions similar to [Cloudflare Workers](https://workers.cloudflare.com/) and [Deno Deploy](https://deno.com/deploy).

Goals:

- Have common functionality: deploy multiple workers via a compatible API, get a route
- Be simple: self-contained with no complicated configuration
- For personal use: no load balancing, not "web scale", no performance guarantees

## Quickstart

```bash
# Install workerbox
deno install --unstable --allow-net --allow-read -r -f https://raw.githubusercontent.com/cschomburg/workerbox/master/workerbox.ts

# Run the server
workerbox serve

# Publish a worker
workerbox publish worker.js
```
