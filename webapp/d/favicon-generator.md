<webui-data data-page-title="Favicon Generator" data-page-subtitle="Make an ICO Icon for Your Website" data-page-description="Make a favicon.ico for your website from a PNG, JPG, or WebP image. Resize to 32, 48, or up to 256 pixels. Free and private."></webui-data>

<webui-quote theme="title">
Turn a logo or image into a favicon.ico file for your website, the small icon shown in browser tabs and bookmarks. Everything runs in your browser.
</webui-quote>

<app-image-converter to="ico"></app-image-converter>

## How It Works

<webui-page-segment elevation="10">
1. **Choose Your Logo**: Select a square image, ideally at least 256 pixels wide. PNG with transparency works best.
1. **Set the Size**: Choose Resize To Width and enter 48 for a classic favicon, or keep it at up to 256 pixels.
1. **Download**: Save the ICO file, then rename it to favicon.ico.
1. **Add It to Your Site**: Put it in your website's root folder, or link it in your page's head.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Any Starting Image**: Convert from PNG, JPG, WebP, or BMP.
- **Keeps Transparency**: Rounded or shaped logos keep their see-through corners.
- **Size Limit Handled**: Images larger than 256 pixels, the most an ICO can hold, are scaled down for you.
</webui-page-segment>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### What size should my favicon be?

48 by 48 pixels is a safe choice for favicon.ico. Browsers scale it for tabs and bookmarks. Start from a square image so the icon is not stretched.

### How do I add the favicon to my website?

Name the file favicon.ico and put it in your site's root folder, where browsers look for it. You can also point to it from your page's head with a link tag whose rel is icon.

### Does the ICO file contain several sizes?

No. It holds one image at the size you choose. Modern browsers handle a single 48 or 64 pixel icon well. For phone home screens, also add a 180 pixel PNG as an apple-touch-icon.

### Can I use a PNG instead of an ICO?

Yes. All current browsers accept a PNG favicon through a link tag. An ICO is still useful because some tools request /favicon.ico directly.

</webui-page-segment>

<app-related-tools></app-related-tools>
