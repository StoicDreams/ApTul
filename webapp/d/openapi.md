<webui-data data-page-title="OpenAPI Viewer" data-page-subtitle="Visualize API Docs via URL"></webui-data>

<webui-quote theme="title">
Enter any URL to instantly visualize OpenAPI specifications. Supports JSON. Lightweight, browser-based rendering for public, local, or internal API docs.
</webui-quote>

<webui-page-segment elevation="10">
A streamlined tool to load and visualize OpenAPI 3.0+ documentation directly from a URL. Whether you are debugging a localhost endpoint or reviewing a public API standard, simply plug in the link to render the interactive documentation.
</webui-page-segment>

<webui-input-text label="Source URL" data-trigger="openapi-src"></webui-input-text>
<webui-openapi data-subscribe="openapi-src:setSource"></webui-openapi>

## How It Works

<webui-page-segment elevation="10">
- **Enter URL**: Paste the link to your openapi.json file.
- **Fetch & Render**: The tool pulls the specification directly from the source and generates the interactive UI.
- **Test & Explore**: View schemas, check endpoints, and explore the API structure immediately.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Direct URL Loading**: No need to download files or clone repositories. Just point to the hosted spec file.
- **Localhost Friendly**: perfect for testing APIs running on your local machine (e.g., http://localhost:8080/v3/api-docs).
- **Client-Side Fetching**: The request is made directly from your browser to the source, keeping the connection direct and fast.
</webui-page-segment>

#### Why Use This Tool?

<webui-page-segment elevation="10">
Often, API specifications are hosted on staging servers, local environments, or public repositories. Downloading these files just to view them in an editor is tedious. This viewer acts as a "browser" for your API contracts - giving you an instant, readable view of any accessible URL.
</webui-page-segment>

##### Technical Notes

<webui-page-segment elevation="10">
Since this tool fetches via JavaScript in the browser, CORS (Cross-Origin Resource Sharing) can sometimes block requests if the server hosting the JSON file doesn't explicitly allow it.

If the document fails to load, ensure the hosting server allows CORS requests, or that you are on the same network as the server.
</webui-page-segment>
