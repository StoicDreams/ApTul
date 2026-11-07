# Adding a Tool

Every tool on Ap Tul follows the same layout, so pages are quick to build, look consistent, and give search engines what they need.

## Checklist

1. Create the component in `webapp/wc/{name}.js`, then regenerate its min file:

    ```bash
    esbuild --minify --legal-comments=inline webapp/wc/{name}.js --outfile=webapp/wc/{name}.min.js --allow-overwrite
    ```

2. Create the page in `webapp/d/{url}.md` from the template below.
3. Add the tool to `webapp/root_files/tools.json`. This feeds the related tools on every page, and the home page directory.
4. Add a link to the list inside `<app-tool-directory>` in `webapp/d/root.md`, under its category. Search engines read this list from the static page, and the directory replaces it when the page loads.
5. Add the page to `webapp/root_files/nav.json` and `webapp/root_files/sitemap.xml` (or run `PowerShell/BuildSiteMap.ps1`).
6. Add `tests/{name}.spec.mjs` that uses the tool the way a visitor would. `tests/tools.spec.mjs` already checks that steps 3 to 5 match.

## Page template

```markdown
<webui-data data-page-title="{Tool Name}" data-page-subtitle="{Short benefit}" data-page-description="{One or two sentences for search results, under 160 characters.}"></webui-data>

<webui-quote theme="title">
{What the tool does and why it is safe, in one or two sentences.}
</webui-quote>

<app-{name}></app-{name}>

## How It Works

<webui-page-segment elevation="10">
1. **{Step}**: {What to do.}
1. **{Step}**: {What happens.}
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **{Feature}**: {Why it matters.}
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### {A question people search for?}

{A direct answer in the first sentence, then any detail.}

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
```

## Writing the page

- **Title:** use the words people search for, such as "JSON Formatter" or "PNG to WebP Converter". The browser title is "Title: Subtitle".
- **Description:** `data-page-description` is what search results show. Without it, the first paragraph is used, cut at 160 characters.
- **FAQ:** answer real questions in the first sentence. Good sources are Google's "People also ask" box and the questions you had while building the tool.
- **Accuracy:** only claim what the tool really does. Check privacy claims in particular, such as whether anything leaves the browser.

## Shared components

| Component | Use it for |
|---|---|
| `app-tool-output` | A text result with Copy (copies the exact text) and Download. `<app-tool-output label="Result" lang="json" filename="result.json" mime="application/json">`, then call `setValue(text)` or bind it with `data-subscribe`. Empty results hide the box. |
| `app-image-converter` | The image converter. Set `to` (webp, jpg, png, ico, bmp, or same) to choose the starting format, so one tool can serve pages such as PNG to WebP. |
| `app-file-drop` | Wrap a tool so files can be dropped on it. Set `accept` the same as a file input, `read` to `auto`, `text`, `dataurl`, or `buffer`, and `multiple` for more than one file. Listen for `change` and read `value`, which has the same shape as `webui-file-select`. |
| `app-file-list` | Several files in an order the visitor chooses, with move and remove buttons, as used by Merge PDF and Image to PDF. Set `accept`, `label`, and `button`, or `single` for one file. Its `value` is `[{ name, type, size, bytes }]` with bytes as a `Uint8Array`. Listen for `change`, and for `rejected`, whose `detail` lists the names of skipped files. |
| `webui.worker` | Runs the Rust functions in `webapp/src` in a worker, such as `await webui.worker.qr_code(...)`. The worker and its WebAssembly (about 500 KB compressed) only load with the first call, so only tools that need Rust should call it. `Uint8Array` arguments and results are passed as binary. Errors reject with the Rust error message. |
| `app-ad-slot` | One ad. Keep the two in the template where they are, away from the tool, since ads next to buttons can be clicked by mistake and break ad network rules. See [Ads](#ads). |
| `app-tool-directory` | The home page directory, grouped by category with search. Put a plain list of tool links inside it (see step 4). |
| `app-related-tools` | Put at the end of every tool page. Lists other tools from `tools.json`, starting with the same category. Optional `category`, `limit`, and `heading` attributes. |

Framework components that tools often need: `webui-code` (shows code; prefer `app-tool-output` for results people copy), `webui-input-text`, `webui-input-message`, `webui-dropdown`, `webui-file-select`, `webui-file-preview`, and `webui-content-compare`.

## Security

Tool input comes from visitors, so never put it into `innerHTML` or attribute strings. Use `innerText`, `webui.create` with the `text` key, or `setValue` on components.

## Things that have caught us out

- **Hiding parts of a tool:** older versions of `webui-flex` set `display: flex !important`, so `style.display = 'none'` did nothing. The framework no longer does this, but the existing tools use plain `div`s for parts they hide, which also works.
- **Components load on demand:** wait with `customElements.whenDefined(tag)` before calling a component's methods, such as `setValue` on `app-tool-output`. Run the tool once after waiting, so anything typed while it loaded is handled.
- **Alerts:** pass an object, as in `alert.setValue({ text: message }, 'danger')`. A plain string is first tried as JSON.
- **Inputs:** use `webui-input-message` for text people paste into a tool. `webui-input-text` cleans what is typed, which can change values such as JSON or URLs.
- **Copying results:** show results with `app-tool-output`, which adds a Copy button, and a Download button when `filename` is set. Older versions of `webui-code` copied the displayed text, which lost tabs and whitespace. It now copies the exact value.
- **Components inside results:** a site component only loads once one is on the page. Create result components such as `app-tool-output` when the tool renders, not later, or waiting for them never finishes.
- **Attributes that are on when present:** `webui.create('input', { multiple: false })` still adds `multiple`, which turns it on. Leave the key out instead.
- **Events from inner components bubble:** `change` from an inner `app-file-drop` or `webui-file-select` reaches listeners on the tool around it, before the outer component has handled it. Stop it with `stopPropagation()` when the outer component sends its own event.
- **Code copied into a worker:** the minifier renames functions and constants, so a function whose source is copied into a worker (as in the Regex Tester) must not use anything outside itself.
- **Image claims:** check what the converter really produces before writing about it. For example, the Rust image crate only writes lossless WebP, so lossy JPG and WebP are saved by the browser instead.

## Ads

Ad slots show nothing until ads are set up, so pages can carry them before an ad network approves the site. Once approved:

1. Add the network's settings to `webapp/root_files/appConfig.json`. Each name in `slots` matches a slot's `name`, and its value is the ad unit ID from the network:

    ```json
    "ads": {
        "network": "adsense",
        "client": "ca-pub-0000000000000000",
        "slots": { "content": "1234567890", "footer": "2345678901" }
    }
    ```

2. Add `webapp/root_files/ads.txt` with the line the network gives you.

A slot reserves its space as soon as the page loads, so the page does not jump, and loads its ad the first time it scrolls into view. The ad script loads once, with the first ad. To turn ads off, remove `ads` from `appConfig.json`.

