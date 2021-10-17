# workerbox

Small selfhosted environment to deploy Service Worker-like functions similar to [Cloudflare Workers](https://workers.cloudflare.com/) and [Deno Deploy](https://deno.com/deploy).

Goals:

- Have common functionality: deploy multiple workers via a compatible API, get a route
- Be simple: self-contained with no complicated configuration
- For personal use: no load balancing, not "web scale", no performance guarantees

## Quickstart

```bash
# Install workerbox
deno install -qAf --unstable https://raw.githubusercontent.com/cschomburg/workerbox/master/workerbox.ts

# Run the server
workerbox serve

# Publish a worker
cd examples/hello-world
workerbox publish hello-world ./worker.js
```

## Environment variables

- `WORKERBOX_ADDR=0.0.0.0:8000`: server listen address
- `WORKERBOX_URL=http://127.0.0.1:8000`: server for client to connect to
- `WORKERBOX_DOMAIN=workers.local`: wildcard domain to use for worker routes
- `WORKERBOX_DB=./workerbox.db`: path to database file

## Roadmap

- [x] publish/update a worker script
- [x] rudimentary routing
- [x] commandline client
- [x] persistence via SQLite
- [x] manage secret variables
- [ ] KV storage
- [ ] manage routes
- [ ] WASM WASI support
- [ ] external runners / routers
- [ ] rewrite everything in Rust
