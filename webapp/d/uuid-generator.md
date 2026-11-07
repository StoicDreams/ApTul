<webui-data data-page-title="UUID Generator" data-page-subtitle="Version 4 and Version 7 UUIDs" data-page-description="Generate random version 4 or time-ordered version 7 UUIDs (GUIDs), up to 1,000 at once. Created by your browser's secure random generator."></webui-data>

<webui-quote theme="title">
Generate version 4 or version 7 UUIDs, also called GUIDs, one at a time or up to 1,000 at once. They are created in your browser with its secure random number generator.
</webui-quote>

<app-uuid-generator></app-uuid-generator>

## How It Works

<webui-page-segment elevation="10">
1. **Pick a Version**: Version 4 is fully random. Version 7 starts with the current time.
1. **Choose How Many**: Generate one, or up to 1,000 at once.
1. **Set the Format**: Choose uppercase or lowercase, with or without hyphens, and with or without braces.
1. **Copy or Download**: Copy the list, or download it as a text file with one UUID per line.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Secure Randomness**: Uses the browser's cryptographic random number generator.
- **Version 7**: Time-ordered UUIDs that sort by creation time, which keeps database indexes efficient.
- **Formats for Any System**: Braces and uppercase suit Microsoft tools, and no hyphens suits compact storage.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### What is the difference between a UUID and a GUID?

They are the same thing. GUID is the name Microsoft uses for a UUID. Both are 128-bit identifiers written as 32 hexadecimal digits.

### Should I use version 4 or version 7?

Use version 7 for database keys. Because it starts with a timestamp, new values sort after older ones, which keeps indexes compact and fast. Use version 4 when an identifier should reveal nothing, including when it was made.

### Can two UUIDs ever be the same?

In practice, no. A version 4 UUID has 122 random bits, so you would need to generate billions of them every second for many years before a duplicate became likely.

### Are these UUIDs saved anywhere?

No. They are created in your browser and are not sent to or stored on any server.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
