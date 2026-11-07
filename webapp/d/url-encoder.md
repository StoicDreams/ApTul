<webui-data data-page-title="URL Encoder & Decoder" data-page-subtitle="Percent-Encode and Decode URLs" data-page-description="Percent-encode text for URLs and query strings, or decode encoded URLs back to readable text. Runs in your browser, so nothing is uploaded."></webui-data>

<webui-quote theme="title">
Make text safe to use in a URL, or turn an encoded URL back into readable text. Choose between encoding a single value and encoding a whole URL.
</webui-quote>

<app-url-encoder></app-url-encoder>

## How It Works

<webui-page-segment elevation="10">
1. **Choose a Mode**: Encode a URL part, encode a full URL, or decode.
1. **Paste Your Text**: The result updates as you type.
1. **Copy the Result**: Use the copy button to take it to your code or browser.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Two Ways to Encode**: Encode a single value, such as a search term, or a whole URL while keeping its structure.
- **Form Data**: When decoding, read + as a space, the way submitted HTML forms send spaces.
- **Clear Errors**: If decoding fails, the tool explains why instead of showing a broken result.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Should I encode a URL part or a full URL?

Encode a URL part for values you put into a URL, such as a query string value or a single path segment. It encodes characters like / ? & and =. Encode a full URL when you already have a complete address and only need to make spaces and other unsafe characters safe, keeping the characters that give the URL its structure.

### Why is a space sometimes %20 and sometimes +?

Both mean a space. %20 works everywhere in a URL. The + sign only means a space in submitted form data and query strings. When decoding, choose "Read as spaces" for plus signs if your text came from a form.

### Why does decoding show an error?

A % sign must be followed by two hexadecimal digits, such as %20. Text with a lone % or an incomplete code cannot be decoded. Encode a literal % sign as %25.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
