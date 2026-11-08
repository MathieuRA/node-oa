import http from 'node:http'

import { Router, type HttpCallback } from './router.ts';
export { ApiResponse } from './response.ts'

export class Server {
    private server: Readonly<http.Server>
    private config: Readonly<{
        port: number
    }>
    private router: Readonly<Router>

    constructor(
        config: {
            port: number,
            basePath?: string,
            openApi?: {
                path: string,
                version: "3.2.0"// only support 3.2.0 for now
                info: {
                    title: string,
                    apiVersion: string
                }
            }
        }) {
        this.server = http.createServer()
        this.config = Object.freeze({ port: config.port })
        this.router = Object.freeze(new Router({ basePath: config.basePath }))

        if (config.openApi !== undefined) {
            const { openApi } = config

            this.router.get(config.openApi.path, ({ response }) => {
                const headers: http.OutgoingHttpHeaders = {
                    "content-type": "application/json"
                }
                const spec = {
                    openapi: openApi.version,
                    info: {
                        title: openApi.info.title,
                        version: openApi.info.apiVersion
                    },
                    paths: this.router.openApiPaths
                }

                response.writeHead(200, 'OK', headers)
                response.write(JSON.stringify(spec))
                response.end()
            })
        }


        this.server.on('request', this.router.setupMiddleware)
    }
    listen() {
        this.server.listen(this.config.port, () => console.log(`web server listening on http://localhost:${this.config.port}`))
    }

    get(path: string, callback: HttpCallback) {
        this.router.get(path, callback)
        return this
    }

    post(path: string, callback: HttpCallback) {
        this.router.post(path, callback)
        return this
    }

    delete(path: string, callback: HttpCallback) {
        this.router.delete(path, callback)
        return this
    }

    patch(path: string, callback: HttpCallback) {
        this.router.patch(path, callback)
        return this
    }
}
