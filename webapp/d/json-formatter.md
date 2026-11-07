<webui-data data-page-title="JSON Formatter & Validator" data-page-subtitle="Format, Minify, and Check JSON" data-page-description="Format, validate, and minify JSON in your browser. Shows the line and column of any error. Your data never leaves your device."></webui-data>

<webui-quote theme="title">
Paste JSON to format it, check it for errors, or minify it. Everything runs in your browser, so private data and API responses stay on your device.
</webui-quote>

<app-json-formatter></app-json-formatter>

## How It Works

<webui-page-segment elevation="10">
1. **Add Your JSON**: Paste it into the box, or drop a .json file onto it.
1. **Check the Result**: The tool tells you straight away whether the JSON is valid. If it is not, it shows the error with its line and column.
1. **Choose a Style**: Pick 2 spaces, 4 spaces, tabs, or minified output, and optionally sort object keys from A to Z.
1. **Copy or Download**: Copy the result, or download it as a .json file.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Private**: Your JSON is processed by your own browser and is never uploaded.
- **Clear Errors**: Find a missing comma or quote quickly with the line and column of the problem.
- **Minify for Production**: Remove all extra spaces to make JSON as small as possible.
- **Sort Keys**: Sorting keys makes two JSON files much easier to compare.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Is my JSON sent to a server?

No. The formatting and checking happen in your browser with JavaScript, so you can safely format API responses or configuration that contains private data.

### Why does my JSON show an error?

The most common causes are a missing or extra comma, single quotes instead of double quotes, keys without quotes, and comments. JSON allows none of these, even though JavaScript does. The error message shows the line and column where the problem was found.

### What is the difference between formatting and minifying?

Formatting adds line breaks and indentation so people can read the JSON. Minifying removes them to make the file smaller for sending over a network. Both contain exactly the same data.

### Are very large numbers kept exactly?

Not always. Numbers larger than 9,007,199,254,740,991 lose precision when JSON is read in a browser, so very large IDs can change slightly. Store large IDs as strings to keep them exact.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
