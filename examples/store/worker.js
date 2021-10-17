const STORE = new StorageArea();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function parseMessage(request) {
  const type = request.headers.get('content-type')
  if (type === 'application/json') {
    const body = await request.json();
    if (body.text) {
      return body.text
    }
  }

  if (
    type === 'application/x-www-form-urlencoded' ||
    type === 'multipart/form-data'
  ) {
    const body = await request.formData();
    if (body.get('text')) {
      return body.get('text')
    }
  }

  const text = await request.text();

  return text || 'no content';
}

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  if (request.method === 'POST') {
    const text = await parseMessage(request)
    console.log('store', text)
    await STORE.set('value', text)
    await STORE.set('updated_at', (new Date()).toISOString());
    return new Response('ok', {status: 200})
  } else {
    console.log('retrieve')
    const value = await STORE.get('value')
    const updated_at = await STORE.get('updated_at')
    const data = {
      value,
      updated_at,
    };
    return new Response(JSON.stringify(data), {status: 200})
  }
}
