<webui-data data-page-title="Base64 Encoder & Decoder" data-page-subtitle="Encode and Decode Text and Files" data-page-description="Encode text or files to Base64 and decode Base64 back to text, with UTF-8 and URL-safe support. Runs in your browser, so nothing is uploaded."></webui-data>

<webui-quote theme="title">
Encode text or files to Base64, or decode Base64 back to readable text. Supports emoji and other UTF-8 characters, and the URL-safe alphabet. Nothing is uploaded.
</webui-quote>

<app-base64-tool></app-base64-tool>

## How It Works

<webui-page-segment elevation="10">
1. **Choose a Mode**: Pick Encode to turn text into Base64, or Decode to turn Base64 back into text.
1. **Add Your Input**: Type or paste text. To encode a file, choose it with the button or drop it onto the text box.
1. **Pick an Alphabet**: Use Standard for most purposes, or URL-safe for values that go in URLs and file names.
1. **Copy or Download**: Copy the result, or download it as a text file.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Full UTF-8 Support**: Accented letters, other alphabets, and emoji encode and decode correctly.
- **URL-Safe Base64**: Uses - and _ instead of + and /, and leaves out the = padding, for use in URLs and tokens.
- **Files**: Encode images, PDFs, or any other file to Base64 for embedding in code or data.
- **Forgiving Decoder**: Accepts both alphabets, with or without padding and line breaks.
</webui-page-segment>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Is Base64 a form of encryption?

No. Base64 only changes how data is written, so anyone can decode it. Never use it to hide passwords or other secrets.

### Why does my decoded text show an error?

The error explains what went wrong. Either the input has characters that Base64 does not use, it is cut off part way through, or it decodes to data that is not text, such as an image.

### What is URL-safe Base64?

Standard Base64 uses + and /, which have special meanings in URLs. URL-safe Base64, used by JSON Web Tokens among others, uses - and _ instead and usually drops the = padding at the end.

### Why is the Base64 version bigger than my file?

Base64 writes every 3 bytes as 4 characters, so encoded data is about a third larger than the original.

</webui-page-segment>

<app-related-tools></app-related-tools>
