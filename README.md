# nodeoa

A small HTTP router for Node.js, written in TypeScript, with no runtime dependencies. You declare your routes and it builds the OpenAPI spec from them.

It's early (version 0.0.0): the API will change, and it isn't on npm yet.

## Requirements

Node.js 22.18 or later. There's no build step: Node runs the TypeScript sources directly, using its built-in type stripping.

## Example

```ts
import { Server, ApiResponse } from 'nodeoa'

const app = new Server({ port: 3001, basePath: '/api' })

app
    .get('/users/:id', ({ id }) => {
        return new ApiResponse({ data: { id } })
    })
    .post('/users', async ({ request, body }) => {
        const user = await body<{ name: string }>(request)
        return new ApiResponse({ status: 201, data: user })
    })

app.listen()
```

`GET /api/users/42` returns `{"id":42}`.

## Routes

The callback receives an object with:

- `request` and `response`: Node's own `http.IncomingMessage` and `http.ServerResponse`
- `body`: call `await body(request)` to read the request body as JSON
- one property per path parameter: `/users/:id` gives you `id`. Values that look like numbers are converted, so `/users/42` gives `42`, not `'42'`.

What the callback returns decides the response:

- an `ApiResponse`: sent as JSON, with its status (200 by default)
- nothing: an empty 200
- if you wrote to `response` yourself (to send HTML, for example), the router leaves it alone

## Base path

`basePath` is added in front of every route. Slashes are cleaned up, so `'/api'`, `'api'` and `'/api/'` give the same result.

## OpenAPI

Pass `openApi` and the spec is served at that path, base path included:

```ts
const app = new Server({
    port: 3001,
    basePath: '/api',
    openApi: {
        path: '/openapi.json',
        version: '3.2.0',
        info: { title: 'My API', apiVersion: '1.0.0' },
    },
})
```

Here the spec is at `/api/openapi.json`. Every route you declare ends up in it, the spec route included.

It's still basic: each operation is documented as a 200 returning a JSON object, there are no request schemas, and path parameters keep the `:id` syntax instead of OpenAPI's `{id}`. Only OpenAPI 3.2.0 is supported.

## Trying it locally

`index.ts`, at the root of the repo, is a small test app. It also serves a Swagger UI (loaded from a CDN) to browse the spec:

```sh
node index.ts
```

Then open http://localhost:3001/api/swagger.

## License

AGPL-3.0-or-later
