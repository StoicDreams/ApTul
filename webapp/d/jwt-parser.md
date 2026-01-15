<webui-data data-page-title="JWT Decoder & Debugger" data-page-subtitle="Private, Client-Side Token Inspector"></webui-data>

<webui-quote theme="title">
Decode and inspect JSON Web Tokens (JWT) directly in your browser. 100% client-side execution ensures your sensitive tokens are never sent to a server. View headers, payloads, and expiration dates instantly.
</webui-quote>

<webui-page-segment elevation="10">
Instantly decode and inspect JSON Web Tokens (JWT) without compromising security. This tool runs entirely in your browser using JavaScript, ensuring your sensitive authentication tokens never leave your device.
</webui-page-segment>

<webui-quote theme="info">
Note: This tool decodes and visualizes the token structure. It does not verify the cryptographic signature against your secret key.
</webui-quote>

<app-jwt-parser></app-jwt-parser>

## How It Works

<webui-page-segment elevation="10">
- **Paste Token**: Enter your encoded JWT string (starting with ey...).
- **Instant Decode**: The tool automatically splits the token into its three core components: Header, Payload, and Signature.
- **Inspect Claims**: View your data in formatted JSON. UNIX timestamps (like exp and iat) are automatically converted into human-readable dates so you can easily check if a token is expired.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Zero-Server Latency**: Decoding happens instantly in your browser's memory. No API calls are made.
- **100% Privacy Focused**: Unlike other online debuggers that might log your data, this tool guarantees that your tokens are processed locally. Perfect for debugging production or sensitive staging tokens.
- **Smart Date Formatting**: No more manually converting UNIX timestamps. We automatically detect exp (Expiration) and iat (Issued At) claims and display the real date and time alongside the raw number.
- **Visual Clarity**: Color-coded sections help you distinguish between the Algorithm (Header), Data (Payload), and Verification (Signature).
</webui-page-segment>

#### Why use this tool?

<webui-page-segment elevation="10">
Debugging authentication issues often requires checking the claims inside a JWT. However, pasting a valid session token into a random website is a major security risk. Ap Tul solves this by moving the logic to the client-side. You get the convenience of a web UI with the security of a local script.
</webui-page-segment>
