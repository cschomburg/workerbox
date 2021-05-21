#!/usr/bin/env bash

# curl -X PUT "http://localhost:8000/v1/workers/scripts/hello-world" \
#     -F main.js=@worker.js
deno run --unstable --allow-net --allow-read=worker.js deployer.ts publish worker.js

sleep 1
curlie -H "Host: hello-world.workers.local" "http://localhost:8000/asdasd"
