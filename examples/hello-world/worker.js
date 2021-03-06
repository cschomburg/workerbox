console.log("hi from worker");

addEventListener("fetch", (event) => {
  const data = {
    hello: "world",
    secret: MY_TOKEN,
  };

  const json = JSON.stringify(data, null, 2);

  return event.respondWith(
    new Response(json, {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    }),
  );
});

console.log("bye from worker");
