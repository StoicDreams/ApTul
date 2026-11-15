<webui-data data-page-title="OpenAPI Viewer" data-page-subtitle="View Swagger and OpenAPI Docs" data-page-description="View OpenAPI and Swagger documents as readable API docs. Load JSON or YAML from a link, paste it, or choose a file. Pasted documents never leave your device."></webui-data>

<webui-quote theme="title">
Turn an OpenAPI or Swagger document into readable API documentation. Load it from a link, paste it, or choose a file, in JSON or YAML. Pasted and chosen documents are read in your browser and never uploaded.
</webui-quote>

<app-openapi-viewer sample="/samples/bookshelf-openapi.yaml"></app-openapi-viewer>

## How It Works

<webui-page-segment elevation="10">
1. **Load a Document**: Enter a link to an openapi.json or openapi.yaml file, paste the document, or choose or drop a file. Try a sample to see how it looks.
1. **Browse the API**: Endpoints are grouped by tag. Search by path, method, summary, or tag, and open an endpoint to see its parameters, request body, and responses.
1. **Read the Schemas**: Every request and response shows its schema as a tree, with types, required fields, allowed values, and examples. The Schemas list at the end shows every shared schema.
1. **Try a Request**: Open Try it on an endpoint, fill in the parameters, and send a real request to the API's server.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **JSON and YAML**: Reads OpenAPI 3.0, 3.1, and Swagger 2.0 documents in either format.
- **Private by Default**: Pasted text and chosen files are read on your device, so internal and unreleased API designs stay private.
- **References Followed**: Shared schemas, parameters, and responses ($ref) are filled in where they are used, including schemas that refer to themselves.
- **Search and Tags**: Find an endpoint in a large API by typing part of its path, summary, or operation ID.
- **Examples**: Shows the document's examples, or makes one from the schema, and fills the Try it body with it.
- **Links to Endpoints**: Opening an endpoint puts a link to it in the address bar.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Is my API document uploaded anywhere?

No, not when you paste it or choose a file. It is read and shown by your browser. When you load a link, your browser fetches the document straight from that address, and nothing passes through {APP_NAME}.

### What is the difference between OpenAPI and Swagger?

Swagger was the original name of the specification. Version 2.0 is usually called Swagger, and version 3.0 and later are called OpenAPI. This viewer reads both.

### Why won't my document load from a link?

The most common cause is CORS. Your browser fetches the file directly, so the server must allow other sites to read it. If it does not, download the file and choose it, or paste its contents instead.

### Why does Try it fail when the documentation loads?

The API itself must allow requests from other sites (CORS). Try it also sends requests without your cookies, since most APIs reject cookies from other sites. Requests to an API on your own computer, such as http://localhost:8080, work when that server allows CORS.

### Can I view a YAML file?

Yes. YAML documents are converted to JSON in your browser, including anchors and merge keys.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
