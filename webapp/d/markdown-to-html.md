<webui-data data-page-title="Markdown to HTML Converter" data-page-subtitle="With Live Preview" data-page-description="Convert Markdown to clean HTML with a live preview. Supports CommonMark and GitHub tables, task lists, strikethrough, and footnotes."></webui-data>

<webui-quote theme="title">
Paste Markdown to get clean HTML, with a live preview. It follows the CommonMark standard, with GitHub's tables, task lists, strikethrough, and footnotes when you want them.
</webui-quote>

<app-markdown-to-html></app-markdown-to-html>

## How It Works

<webui-page-segment elevation="10">
1. **Paste Markdown**: Type or paste your Markdown. A sample shows what is supported.
1. **Choose a Style**: Leave GitHub style on for tables and task lists, or turn it off for standard CommonMark only.
1. **Copy or Download**: Copy the HTML, or download it as an HTML file. The preview shows how it will look.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Standard Output**: The CommonMark rules are what GitHub, GitLab, and most static site generators follow, so the HTML matches what those sites show.
- **Clean HTML**: Plain tags with no styles or classes added, apart from a language class on code blocks for syntax highlighters.
- **Safe Preview**: The preview cannot run scripts, so pasting Markdown from elsewhere is safe.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Is HTML inside my Markdown kept?

Yes. Markdown allows HTML, so it is passed through to the output as written. Check HTML from people you do not trust before putting it on a website, since it can contain scripts.

### Why does a single line break not start a new line?

In Markdown, a single line break joins the lines into one paragraph. Leave a blank line to start a new paragraph, or end a line with two spaces or a backslash for a line break.

### How do I add syntax highlighting to code?

Write the language after the opening backticks, such as three backticks then js. The code block gets a class such as language-js, which highlighters like Prism and highlight.js use.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
