<webui-data data-page-title="Diff Checker" data-page-subtitle="Compare Two Texts" data-page-description="Compare two texts or files line by line and see exactly what was added, removed, or changed. Runs in your browser, so your text is never uploaded."></webui-data>

<webui-quote theme="title">
Paste two versions of a text to see exactly what changed, line by line. Useful for code, configuration, contracts, and documents. Everything stays in your browser.
</webui-quote>

<app-diff-checker></app-diff-checker>

## How It Works

<webui-page-segment elevation="10">
1. **Paste the Original**: Put the older version in the first box.
1. **Paste the Changed Version**: Put the newer version in the second box.
1. **Review the Changes**: Removed lines are marked in red and added lines in green. Switch to the full view to see unchanged lines too.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Line by Line**: Uses the same diff method as Git, so changes line up the way you expect.
- **Changes or Full View**: Focus on what changed, or see the whole text with changes marked.
- **Private**: Compare contracts, code, or configuration without uploading them anywhere.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Is my text uploaded to compare it?

No. The comparison runs in your browser, so the text never leaves your device.

### Why is a whole line marked when I changed one word?

The comparison works line by line, which is how code tools such as Git show changes. A line with any change is shown as removed in its old form and added in its new form, next to each other so you can spot the difference.

### Do line endings matter?

No. Windows and Unix line endings are treated the same, so a file saved on a different system does not show every line as changed.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
