<webui-data data-page-title="Color Contrast Checker" data-page-subtitle="WCAG AA and AAA" data-page-description="Check the contrast ratio between text and background colors against WCAG 2 AA and AAA accessibility levels, with a live preview of normal and large text."></webui-data>

<webui-quote theme="title">
Check whether your text and background colors have enough contrast to be readable. See the contrast ratio, a pass or fail for each WCAG 2 level, and a live preview.
</webui-quote>

<app-contrast-checker></app-contrast-checker>

## How It Works

<webui-page-segment elevation="10">
1. **Enter Two Colors**: Type or pick a text color and a background color, in any CSS format.
1. **Read the Ratio**: The contrast ratio ranges from 1:1 (no contrast) to 21:1 (black on white).
1. **Check Each Level**: See whether the colors pass WCAG AA and AAA for normal text, large text, and graphics.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Every WCAG 2 Level**: AA and AAA for normal and large text, plus the level for buttons, icons, and other graphics.
- **Live Preview**: See normal and large text in your colors as you change them.
- **Exact Results**: Ratios are never rounded up, so a color that only nearly passes is shown as failing, as WCAG requires.
</webui-page-segment>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### What contrast ratio do I need?

For WCAG AA, which most accessibility laws and policies point to, normal text needs at least 4.5:1, and large text, buttons, and icons need 3:1. AAA is stricter, at 7:1 for normal text and 4.5:1 for large text.

### What counts as large text?

Text at least 24 pixels (18 points) in size, or at least 19 pixels (14 points) when bold.

### Why does my design look readable but still fail?

People's eyesight, screens, and lighting vary widely. The WCAG levels are set so text stays readable for people with low vision or color blindness, and on a phone in bright sunlight.

</webui-page-segment>

<app-related-tools></app-related-tools>
