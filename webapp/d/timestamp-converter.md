<webui-data data-page-title="Unix Timestamp Converter" data-page-subtitle="Epoch Time to Date and Back" data-page-description="Convert Unix timestamps in seconds, milliseconds, microseconds, or nanoseconds to readable dates in UTC and your time zone, or convert dates to timestamps."></webui-data>

<webui-quote theme="title">
Turn a Unix timestamp into a readable date in UTC and your own time zone, or turn a date into a timestamp. Seconds, milliseconds, microseconds, and nanoseconds are recognized automatically.
</webui-quote>

<app-timestamp-converter></app-timestamp-converter>

## How It Works

<webui-page-segment elevation="10">
1. **Enter a Timestamp or Date**: Paste a Unix timestamp, or a date such as 2026-01-31 14:30 or 2026-01-31T14:30:00Z.
1. **Read Every Format**: See the time in seconds and milliseconds, ISO 8601, UTC, your own time zone, and how long ago it was.
1. **Copy What You Need**: Each format has its own copy button. Press Now to start from the current time.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Automatic Units**: Recognizes seconds, milliseconds, microseconds, and nanoseconds from the number of digits.
- **Both Directions**: Converts timestamps to dates, and dates to timestamps.
- **Your Time Zone**: Shows the local time with your time zone name, alongside UTC.
</webui-page-segment>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### What is a Unix timestamp?

It is the number of seconds since midnight UTC on 1 January 1970, called the Unix epoch. It is the same everywhere in the world, which makes it a common way to store times in software.

### How do I know if a timestamp is in seconds or milliseconds?

By its length. Timestamps for current dates have 10 digits in seconds and 13 digits in milliseconds. The tool shows which unit it used, so you can check.

### How are dates without a time zone read?

A date and time without a time zone, such as 2026-01-31 14:30, is read as your local time. Add Z for UTC, such as 2026-01-31T14:30:00Z, or an offset such as +02:00.

### What is the year 2038 problem?

Older systems store timestamps as a signed 32-bit number of seconds, which runs out on 19 January 2038. Most current systems use 64-bit numbers, which last for billions of years.

</webui-page-segment>

<app-related-tools></app-related-tools>
