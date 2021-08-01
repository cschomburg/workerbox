FROM denoland/deno:latest
EXPOSE 8081

RUN mkdir /data && chown deno: /data
VOLUME /data

WORKDIR /app
USER deno

COPY src/deps.ts ./src/deps.ts
RUN deno cache src/deps.ts

ADD . .
RUN deno cache workerbox.ts

ENV WORKERBOX_DB="/data/workerbox.db"
CMD ["run", "--unstable", "--allow-env", "--allow-net", "--allow-read=.,/data", "--allow-write=/data", "workerbox.ts", "serve"]
