// Swagger UI loaded from a CDN: for local testing only
const SWAGGER_UI_VERSION = '5.34.0' // first version line with OpenAPI 3.2 support
const CDN_URL = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`

/**
 * HTML page that runs Swagger UI on the OpenAPI spec served at `specUrl`.
 */
export function swaggerHtml(specUrl: string): string {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Swagger UI</title>
    <link rel="stylesheet" href="${CDN_URL}/swagger-ui.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="${CDN_URL}/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({ url: ${JSON.stringify(specUrl)}, dom_id: '#swagger-ui' })
    </script>
</body>
</html>`
}
