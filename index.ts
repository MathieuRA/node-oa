import { Server, ApiResponse } from "nodeoa";
import { swaggerHtml } from "./swagger.ts";

// small test environement with swagger CDN
const OPENAPI_PATH = "/openapi.json"
const BASE_PATH = "/api"

const app = new Server({
    port: 3001,
    basePath: BASE_PATH,
    openApi: {
        path: OPENAPI_PATH,
        version: "3.2.0",
        info: { title: "My test API", apiVersion: "1.0.0" }
    }
})

app
    .get('/test', () => {
        return new ApiResponse({ status: 200, data: { 'test': 'OK' } })
    })
    .get('/foo', () => {
        return new ApiResponse({ status: 200, data: { 'foo': 'bar' } })
    })
    .get('/foo/:id', ({ id }) => {
        return new ApiResponse({ status: 200, data: { 'foo': 'bar', id } })
    })
    .post('/foo', ({ body }) => {
        return new ApiResponse({ status: 200, data: { 'foo': 'bar', body } })
    })
    .get('/swagger', ({ response }) => {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        response.end(swaggerHtml(`${BASE_PATH}${OPENAPI_PATH}`))
    })

app.listen()
