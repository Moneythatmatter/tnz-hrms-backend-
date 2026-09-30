import type { Express } from "express";
import { openApiDocument } from "./openapi.js";

export function mountApiDocs(app: Express) {
  app.get("/api-docs.json", (_req, res) => {
    res.json(openApiDocument);
  });

  // Standalone Swagger UI HTML via official CDN
  app.get("/api-docs", (_req, res) => {
    res.type("html").send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>HRMS API Docs</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          <style>.swagger-ui .topbar { display: none }</style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
          <script>
            window.onload = () => {
              window.ui = SwaggerUIBundle({
                url: '/api-docs.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                docExpansion: 'none',
                filter: true,
              });
            };
          </script>
        </body>
      </html>
    `);
  });
}
