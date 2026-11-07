<webui-data data-page-title="Regex Tester" data-page-subtitle="JavaScript Regular Expressions" data-page-description="Test JavaScript regular expressions online with highlighted matches, capture groups, named groups, flags, and find and replace."></webui-data>

<webui-quote theme="title">
Test a regular expression against your text and see every match highlighted, with its capture groups. It uses your browser's JavaScript engine, so results match what your code will do.
</webui-quote>

<app-regex-tester></app-regex-tester>

## How It Works

<webui-page-segment elevation="10">
1. **Enter a Pattern**: Write the expression without the surrounding slashes. Mistakes are reported as you type.
1. **Choose Flags**: Turn on global, ignore case, multiline, dot matches new lines, or Unicode.
1. **Add Test Text**: Matches are highlighted, and the table lists each match with its position and groups.
1. **Replace**: Optionally enter replacement text to see the result, using $1 or $&lt;name&gt; for groups.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Named Groups**: Groups written as (?&lt;name&gt;...) appear in their own column.
- **Safe With Slow Patterns**: Patterns that take more than a second are stopped, so they cannot freeze the page.
- **Private**: Your text is tested in your browser and never sent anywhere.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Which regex flavor does this use?

JavaScript's, as built into your browser. Most syntax is shared with Python, Java, C#, and PCRE, but some features differ, such as lookbehind support in older browsers and the absence of possessive quantifiers.

### Why does my pattern only find one match?

Without the global flag, JavaScript stops at the first match. Turn on Global to find them all.

### Why was my pattern stopped for taking too long?

Nested repeats such as (a+)+ or (.*)* can try a huge number of ways to match text that almost matches. This is called catastrophic backtracking. Rewrite the pattern so each part can only match in one way, for example a+ instead of (a+)+.

### How do I match a literal dot or bracket?

Put a backslash before it, such as \. for a dot or \( for an opening bracket.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
