<webui-data data-page-title="Split PDF" data-page-subtitle="Extract or Separate Pages" data-page-description="Extract pages from a PDF, or split it into several files by page range or into single pages. Free and private, with no upload."></webui-data>

<webui-quote theme="title">
Take the pages you need from a PDF, or split it into several files. Everything happens in your browser, so your document is never uploaded.
</webui-quote>

<app-pdf-split></app-pdf-split>

## How It Works

<webui-page-segment elevation="10">
1. **Add a PDF**: Choose a file, or drop it onto the tool. Its page count is shown.
1. **Choose What to Do**: Extract pages into one PDF, make one PDF per page range, or split every page into its own file.
1. **Enter the Pages**: Write pages and ranges such as 1-3, 5, 8-. A range with no end runs to the last page.
1. **Download**: Extracted pages download straight away. When splitting into several files, select each one to save it.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Private**: Your PDF is read on your device and never uploaded.
- **Flexible Ranges**: Mix single pages and ranges, such as 1, 4-6, 10-.
- **No Quality Loss**: Pages are copied as they are, with their text, images, size, and rotation unchanged.
- **Smaller Files**: Images and fonts used only by removed pages are left out of the new files.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Can I change the order of pages?

Extracted pages keep their order from the original document. To reorder pages, split them into separate files, then join them in the order you want with [Merge PDF](/merge-pdf).

### Are bookmarks kept?

No. Bookmarks can point to pages that were removed, so they are left out of the new files. Page content, including web links on the page, is kept.

### Can I split a password-protected PDF?

PDFs that need a password to open cannot be split here. PDFs with only editing restrictions can be, and the new files have no restrictions.

### Is there a page or size limit?

No. Very large documents depend on your device's memory, since the whole file is processed in your browser.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
