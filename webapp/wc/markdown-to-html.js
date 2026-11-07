/*!
 * Ap Tul Markdown to HTML
 * Converts Markdown to HTML, with a live preview.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * Rust (pulldown-cmark) converts in the worker, following CommonMark, with GitHub's additions when chosen.
     * HTML written in the Markdown is kept, as Markdown allows, so the preview runs in a sandboxed frame that
     * cannot run scripts or reach this page.
     */
    const SAMPLE = `# Project Title

A short description, with **bold**, *italic*, and \`code\`.

## Features

- [x] Tables and task lists
- [ ] Footnotes[^1]

| Option | Default |
|--------|---------|
| size   | 10      |

\`\`\`js
console.log("Hello");
\`\`\`

[^1]: Like this one.
`;

    // The preview may show images from the web, but loads nothing else and runs no scripts.
    const PREVIEW_HEAD = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'">
<base target="_blank"><style>
body { font-family: system-ui, sans-serif; line-height: 1.5; margin: 1rem; color: #222; background: #fff; }
pre { background: #f4f4f4; padding: 0.75rem; overflow-x: auto; } code { font-family: ui-monospace, monospace; }
table { border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 0.25rem 0.5rem; }
img { max-width: 100%; } blockquote { border-left: 4px solid #ccc; margin-left: 0; padding-left: 1rem; color: #555; }
</style>`;

    webui.define('app-markdown-to-html', {
        preload: 'flex input-message alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const input = webui.create('webui-input-message', { label: 'Markdown', placeholder: 'Type or paste Markdown', rows: 12 });
            const optionRow = webui.create('label', { style: 'display:flex; align-items:center; gap:0.5ch; cursor:pointer;' });
            const github = webui.create('input', { type: 'checkbox', name: 'github' });
            github.checked = true;
            optionRow.append(github, document.createTextNode('GitHub style (tables, task lists, strikethrough, and footnotes)'));
            const output = webui.create('app-tool-output', { label: 'HTML', language: 'html', filename: 'document.html', mime: 'text/html' });
            const previewLabel = webui.create('h3', { text: 'Preview', class: 'preview-label', style: 'display:none; margin:0;' });
            const preview = webui.create('iframe', {
                class: 'markdown-preview', title: 'Preview of the converted HTML', sandbox: '',
                style: 'display:none; width:100%; height:24rem; border:1px solid #888; border-radius:var(--border-radius, 4px); background:#fff;',
            });
            wrap.append(input, optionRow, output, previewLabel, preview);
            t.replaceChildren(wrap);

            let runId = 0;
            let timer = null;
            const update = async () => {
                const id = ++runId;
                const markdown = input.value || '';
                if (!markdown.trim()) {
                    output.setValue('');
                    preview.style.display = previewLabel.style.display = 'none';
                    return;
                }
                const html = await webui.worker.markdown_to_html(markdown, github.checked);
                if (id !== runId) return;
                output.setValue(html);
                preview.srcdoc = `<!DOCTYPE html><html><head>${PREVIEW_HEAD}</head><body>${html}</body></html>`;
                preview.style.display = previewLabel.style.display = '';
            };
            // Converting on every key press of a long document would be wasted work, so wait for a pause.
            const schedule = () => {
                clearTimeout(timer);
                timer = setTimeout(update, 200);
            };
            await Promise.all(['webui-input-message', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', schedule);
            github.addEventListener('change', update);
            if (!input.value) input.setValue(SAMPLE);
            update();
        },
    });
}
