<webui-data data-page-title="Hash Generator" data-page-subtitle="MD5, SHA-1, SHA-256, and SHA-512" data-page-description="Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes of text or files, and check a file against an expected hash. Nothing is uploaded."></webui-data>

<webui-quote theme="title">
Get the MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes of any text or file at once, and check a download against the hash its publisher lists. Files are hashed on your device and never uploaded.
</webui-quote>

<app-hash-generator></app-hash-generator>

## How It Works

<webui-page-segment elevation="10">
1. **Add Text or a File**: Type or paste text, or choose or drop a file of any size your browser can open.
1. **Read the Hashes**: All five hashes appear at once, each with its own copy button.
1. **Check a Hash (Optional)**: Paste the hash a website lists for a download, and the tool tells you whether it matches.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Five Algorithms at Once**: No need to pick the right one before you start.
- **Verify Downloads**: Confirm a file was not changed or damaged by comparing it with the publisher's hash.
- **Private**: Text and files are hashed by your browser and never leave your device.
- **UTF-8 Text**: Text is hashed as UTF-8, the same as most programming languages and command line tools.
</webui-page-segment>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Which hash should I use?

Use SHA-256 for most purposes, including checking downloads. MD5 and SHA-1 are fine for spotting accidental changes, but are no longer safe against deliberate tampering. Use SHA-512 when a system asks for it.

### Can I use these hashes to store passwords?

No. These hashes are designed to be fast, which makes guessing passwords fast too. Passwords should be stored with a slow algorithm made for the purpose, such as Argon2, bcrypt, or scrypt.

### Why is my hash different from the one my program gives?

Usually the input is not exactly the same. A trailing line break, a different line ending (Windows uses \r\n), or a different text encoding all change the hash. For example, the echo command adds a line break unless you use echo -n.

### Can a hash be reversed to get the original text?

No. A hash is a one-way fingerprint. Short or common text can sometimes be found by guessing, which is another reason not to rely on fast hashes for secrets.

</webui-page-segment>

<app-related-tools></app-related-tools>
