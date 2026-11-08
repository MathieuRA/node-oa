import type http from 'node:http'
import { ApiResponse } from './response.ts'

// @ts-ignore
export type HttpCallback = (params: { request: http.IncomingMessage, response: http.ServerResponse, [key: string]: number | string, body: <T> (req: http.IncomingMessage) => Promise<T> }) => void | ApiResponse | Promise<void | ApiResponse>
type HttpVerb = 'get' | 'post' | 'delete' | 'patch'
type RouteConfig = {
    path: string
    callback: HttpCallback
    method: HttpVerb,
}
type OpenApiPath = {
    [method in HttpVerb]?: {
        description: string,
        responses: {
            [statusCode: number]: {
                description: string,
                content: {
                    'application/json': {
                        schema: {
                            type: string
                        }
                    }
                }
            }
        }
    }
}

const HTTP_VERB: HttpVerb[] = ['get', 'post', 'delete', 'patch']

function joinPath(...parts: string[]): string {
    const segments = parts
        .flatMap(part => part.split('/'))
        .filter(segment => segment !== '')

    return `/${segments.join('/')}`
}

export class Router {
    private routesByVerb: Record<HttpVerb, Record<string, RouteConfig>>
    private _openApiPaths: Record<string, OpenApiPath> = {}
    private basePath: string

    constructor({ basePath }: { basePath?: string } = {}) {
        this.setupMiddleware = this.setupMiddleware.bind(this)
        // @ts-ignore initialize the variable
        const routes: Record<HttpVerb, {}> = {}
        HTTP_VERB.forEach(verb => {
            routes[verb] = {}
        })
        this.routesByVerb = { ...routes }
        this.basePath = basePath ?? '/'
    }


    get openApiPaths() {
        // return a read-only copy, to ensure external code cannot modify the spec
        return Object.freeze(structuredClone(this._openApiPaths))
    }

    #injectPath(route: { path: string, method: HttpVerb }) {
        const { path, method } = route
        if (this._openApiPaths[path] === undefined) {
            this._openApiPaths[path] = {}
        }
        if (this._openApiPaths[path][method] !== undefined) {
            throw new Error(`OpenAPI path for ${method.toUpperCase()} ${path} already exists`)
        }

        this._openApiPaths[path][method] = {
            description: `Auto-generated route for ${method.toUpperCase()} ${path}`,
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object'
                            }
                        }
                    }
                }
            }
        }

    }

    #addRoute(newRoute: { method: HttpVerb, callback: HttpCallback, path: string }) {
        newRoute.path = joinPath(this.basePath, newRoute.path)

        const routes = this.routesByVerb[newRoute.method]
        if (routes[newRoute.path] !== undefined) {
            throw new Error(`route ${newRoute.path} already exist`)
        }

        this.routesByVerb[newRoute.method][newRoute.path] = newRoute
        this.#injectPath({ method: newRoute.method, path: newRoute.path })
    }

    #matchRoute(key: string, pathname: string) {
        const paramNames: string[] = []

        const regexPattern = key.replace(/:([^/]+)/g, (_, name) => {
            paramNames.push(name)
            return "([^/]+)"
        })

        const regex = new RegExp(`^${regexPattern}$`)
        const match = pathname.match(regex)

        if (!match) {
            return null
        }

        const params = Object.fromEntries(
            paramNames.map((name, index) => [name, isFinite(+match[index + 1]) ? +match[index + 1] : match[index + 1]])
        )

        return params
    }

    async #body<T>(req: http.IncomingMessage): Promise<T> {
        const chunks: Buffer[] = []

        for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }

        return JSON.parse(Buffer.concat(chunks).toString("utf8"))
    }

    get(path: string, callback: HttpCallback): this {
        this.#addRoute({ method: 'get', callback, path })
        return this
    }

    post(path: string, callback: HttpCallback): this {
        this.#addRoute({ method: 'post', callback, path })
        return this

    }

    delete(path: string, callback: HttpCallback): this {
        this.#addRoute({ method: 'delete', callback, path })
        return this
    }

    patch(path: string, callback: HttpCallback): this {
        this.#addRoute({ method: 'patch', callback, path })
        return this
    }

    async setupMiddleware(req: http.IncomingMessage, res: http.ServerResponse) {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (req.method === undefined) {
            throw new Error('Cannot detect the HTTP verb for the request')
        }

        const routes = this.routesByVerb[req.method.toLowerCase() as HttpVerb]

        let route = routes[url.pathname]
        let queries: { [key: string]: (string | number) } = {}

        if (route === undefined) {
            const allKeys = Object.keys(routes)
            for (const key of allKeys) {
                const match = this.#matchRoute(key, url.pathname)
                if (match !== null) {
                    route = routes[key]
                    queries = match
                    break
                }
            }
        }

        // @ts-ignore
        const result = await route.callback({ request: req, response: res, ...queries, body: this.#body })
        if (res.headersSent) {
            return
        }

        const response = result ?? new ApiResponse({ status: 200 })
        res.writeHead(response.statusCode, {
            'content-type': 'application/json'
        }).end(JSON.stringify(response.body))
    }
}