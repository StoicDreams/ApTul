<webui-data data-page-title="Case Converter" data-page-subtitle="Upper, Lower, Title, camelCase, and More" data-page-description="Convert text to UPPER CASE, lower case, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case, or CONSTANT_CASE at once."></webui-data>

<webui-quote theme="title">
Convert text to every common case at once: upper, lower, title, and sentence case for writing, and camelCase, PascalCase, snake_case, kebab-case, and CONSTANT_CASE for code.
</webui-quote>

<app-case-converter></app-case-converter>

## How It Works

<webui-page-segment elevation="10">
1. **Type or Paste**: Add a sentence, a heading, or a list of names with one per line.
1. **Pick Your Case**: Every conversion appears at once, so there is nothing to choose first.
1. **Copy**: Use the copy button on the case you need.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Nine Cases**: Covers writing styles and the naming styles used in most programming languages.
- **Smart Word Splitting**: Reads words from spaces, punctuation, and existing case, so XMLHttpRequest becomes xml_http_request.
- **Line by Line**: Convert a whole list of names at once, keeping one per line.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### What is the difference between camelCase and PascalCase?

Both join words without spaces and start each word with a capital letter. camelCase keeps the first letter lowercase, as in userName, and PascalCase capitalizes it too, as in UserName.

### Which case should I use in my code?

Follow your language's convention. JavaScript and Java use camelCase for variables and PascalCase for classes. Python and Rust use snake_case for variables and functions. CONSTANT_CASE is common for constants, and kebab-case for CSS classes and URLs.

### Does Title Case follow a style guide?

It capitalizes the first letter of every word. Style guides such as AP and Chicago leave short words like "and" and "of" in lowercase, so adjust those by hand if you follow one.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
