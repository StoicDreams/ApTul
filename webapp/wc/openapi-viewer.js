/*!
 * Ap Tul OpenAPI Viewer
 * Load an OpenAPI or Swagger document from a link, pasted text, or a file, in JSON or YAML, and show it with webui-openapi.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-openapi-viewer sample="/samples/bookshelf-openapi.yaml"></app-openapi-viewer>
     *
     * Pasted text and chosen files are read in the browser and never uploaded. A link is fetched by the browser,
     * straight from that address. YAML is converted to JSON by the Rust worker, which only loads for YAML.
     * webui-openapi sends Try it requests without cookies, since most public APIs reject them from other sites.
     */
    const MODES = ['link', 'paste', 'file'];

    /** Parse an OpenAPI document written in JSON or YAML. */
    async function parseSpec(text) {
        const trimmed = `${text || ''}`.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('{')) {
            try {
                return JSON.parse(trimmed);
            } catch (ex) {
                throw `This is not valid JSON: ${ex && ex.message ? ex.message : ex}`;
            }
        }
        // YAML is a superset of JSON, so anything else goes through the YAML parser.
        return JSON.parse(await webui.worker.yaml_to_json(trimmed));
    }

    webui.define('app-openapi-viewer', {
        preload: 'openapi',
        attr: ['sample'],
        constructor() {
            const t = this;
            t._buttons = [...t.template.querySelectorAll('.modes button')];
            t._panels = Object.fromEntries(MODES.map(mode => [mode, t.template.querySelector(`.panel[data-mode="${mode}"]`)]));
            t._linkForm = t.template.querySelector('form.link');
            t._url = t.template.querySelector('input[type=url]');
            t._paste = t.template.querySelector('textarea');
            t._drop = t.template.querySelector('app-file-drop');
            t._file = t.template.querySelector('input[type=file]');
            t._fileName = t.template.querySelector('.file-name');
            t._sampleButton = t.template.querySelector('button.sample');
            t._status = t.template.querySelector('.status');
            t._viewer = t.template.querySelector('webui-openapi');
            t._buttons.forEach(button => button.addEventListener('click', () => t.setMode(button.dataset.mode)));
            t._linkForm.addEventListener('submit', ev => {
                ev.preventDefault();
                t.loadUrl(t._url.value);
            });
            t._paste.addEventListener('input', ev => {
                ev.stopPropagation();
                clearTimeout(t._pasteTimer);
                t._pasteTimer = setTimeout(() => t.showText(t._paste.value, 'the pasted text'), 400);
            });
            t._file.addEventListener('change', ev => {
                ev.stopPropagation();
                if (t._file.files && t._file.files[0]) t.loadFile(t._file.files[0]);
            });
            t._drop.addEventListener('change', ev => {
                // The file input's own change bubbles through the drop zone too. Only handle real drops here.
                if (ev.target !== t._drop) return;
                const dropped = t._drop.value && t._drop.value[0];
                if (dropped) t.showText(dropped.content, dropped.name);
            });
            t._drop.addEventListener('rejected', () => t._setStatus('Drop a .json, .yaml, or .yml file.', 'danger'));
            t._sampleButton.addEventListener('click', () => t.loadSample());
        },
        connected() {
            this.setMode('link');
        },
        /** Show the link, paste, or file input. */
        setMode(mode) {
            const t = this;
            if (!MODES.includes(mode)) return;
            t._mode = mode;
            t._buttons.forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === mode ? 'true' : 'false'));
            for (const [name, panel] of Object.entries(t._panels)) panel.hidden = name !== mode;
        },
        _setStatus(text, theme = 'info') {
            const t = this;
            t._status.textContent = text || '';
            t._status.dataset.theme = theme;
            t._status.hidden = !text;
        },
        /** Fetch a document from a link, in the browser. */
        async loadUrl(value) {
            const t = this;
            const url = `${value || ''}`.trim();
            if (!url) return;
            if (!webui.validateUrl(url)) {
                t._setStatus('Enter a full link, starting with http:// or https://.', 'danger');
                return;
            }
            const run = t._run = (t._run || 0) + 1;
            t._setStatus('Loading...');
            let text;
            try {
                const response = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
                if (!response.ok) throw `The server answered ${response.status} ${response.statusText}.`;
                text = await response.text();
            } catch (ex) {
                if (run !== t._run) return;
                const reason = typeof ex === 'string' ? ex : 'The document could not be loaded. The server may not allow other sites to read it (CORS), or it may be unreachable. Download it and choose it as a file instead.';
                t._setStatus(reason, 'danger');
                return;
            }
            if (run !== t._run) return;
            await t.showText(text, url, url, run);
        },
        /** Read a chosen or dropped file as text, in the browser. */
        async loadFile(file) {
            const t = this;
            t._fileName.textContent = file.name;
            await t.showText(await file.text(), file.name);
        },
        /** Load the sample document into the paste box, so the YAML is there to read and change. */
        async loadSample() {
            const t = this;
            if (!t.sample) return;
            try {
                const response = await fetch(t.sample);
                if (!response.ok) throw response.status;
                const text = await response.text();
                t.setMode('paste');
                t._paste.value = text;
                await t.showText(text, 'the sample');
            } catch (_) {
                t._setStatus('The sample could not be loaded.', 'danger');
            }
        },
        /** Parse JSON or YAML text and show it. baseUrl is where it came from, for relative server addresses. */
        async showText(text, sourceName, baseUrl = '', run = null) {
            const t = this;
            if (run === null) run = t._run = (t._run || 0) + 1;
            if (!`${text || ''}`.trim()) {
                t._setStatus('');
                return;
            }
            t._setStatus('Reading...');
            let doc;
            try {
                doc = await parseSpec(text);
            } catch (ex) {
                if (run !== t._run) return;
                t._setStatus(`${ex && ex.message ? ex.message : ex}`, 'danger');
                return;
            }
            if (run !== t._run) return;
            await customElements.whenDefined('webui-openapi');
            if (!doc || typeof doc !== 'object' || (!doc.paths && !doc.components && !doc.definitions)) {
                t._setStatus(`${sourceName} is not an OpenAPI or Swagger document. It needs paths or components.`, 'danger');
                return;
            }
            t._setStatus('');
            t._viewer.setDoc(doc, { baseUrl });
            t._viewer.hidden = false;
            t.dispatchEvent(new CustomEvent('loaded', { bubbles: true, detail: { source: sourceName } }));
        },
        shadowTemplate: `
<div class="source">
<div class="modes" role="group" aria-label="Where the document comes from">
<button type="button" data-mode="link" aria-pressed="true">Link</button>
<button type="button" data-mode="paste" aria-pressed="false">Paste</button>
<button type="button" data-mode="file" aria-pressed="false">File</button>
<button type="button" class="sample">Try a sample</button>
</div>
<form class="link panel" data-mode="link" novalidate>
<label><span>Document link</span><input type="url" placeholder="https://example.com/openapi.json" autocomplete="url"></label>
<button type="submit" class="go">Load</button>
</form>
<label class="panel" data-mode="paste" hidden><span>OpenAPI or Swagger document, in JSON or YAML</span><textarea rows="10" spellcheck="false" placeholder="openapi: 3.1.0"></textarea></label>
<app-file-drop class="panel" data-mode="file" accept=".json,.yaml,.yml,application/json,text/yaml,application/yaml,text/plain" read="text" label="Drop a .json or .yaml file" hidden>
<div class="file-box">
<label class="file-button">Choose a file<input type="file" accept=".json,.yaml,.yml,application/json,text/yaml,application/yaml"></label>
<span class="file-name">or drop one here</span>
</div>
</app-file-drop>
<p class="status" role="status" hidden></p>
</div>
<webui-openapi credentials="omit" hash="" hidden></webui-openapi>
<style type="text/css">
:host { display:flex; flex-direction:column; gap:calc(var(--padding, 0.5rem) * 2); }
[hidden] { display:none !important; }
.source { display:flex; flex-direction:column; gap:var(--padding, 0.5rem); padding:calc(var(--padding, 0.5rem) * 1.5); border-radius:var(--corners, 3px); background-color:color-mix(in srgb, currentColor 6%, transparent); }
.modes { display:flex; flex-wrap:wrap; gap:0.4rem; }
button, .file-button { font:inherit; padding:0.45em 1.1em; border-radius:var(--corners, 3px); border:1px solid color-mix(in srgb, currentColor 30%, transparent); background-color:transparent; color:inherit; cursor:pointer; }
button[aria-pressed=true] { background-color:var(--color-button, #0b78ce); color:var(--color-button-offset, #fff); border-color:transparent; font-weight:bold; }
button.sample { margin-left:auto; }
button.go, .file-button { background-color:var(--color-button, #0b78ce); color:var(--color-button-offset, #fff); border-color:transparent; font-weight:bold; }
button:focus-visible, input:focus-visible, textarea:focus-visible, .file-button:focus-within { outline:var(--focus-outline, 2px solid currentColor); outline-offset:var(--focus-offset, 2px); }
form.link { display:flex; flex-wrap:wrap; align-items:end; gap:0.5rem; }
form.link label { flex:1 1 20rem; }
label { display:flex; flex-direction:column; gap:0.25rem; font-weight:bold; font-size:0.95em; }
input[type=url], textarea { font:inherit; color:inherit; background-color:color-mix(in srgb, currentColor 8%, transparent); border:1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius:var(--corners, 3px); padding:0.5em 0.6em; font-weight:normal; }
textarea { font-family:var(--font-family-mono, ui-monospace, Consolas, monospace); resize:vertical; min-height:10rem; }
.file-box { display:flex; flex-wrap:wrap; align-items:center; gap:1rem; padding:1.5rem; border:2px dashed color-mix(in srgb, currentColor 35%, transparent); border-radius:var(--corners, 3px); justify-content:center; }
.file-button { flex-direction:row; position:relative; }
.file-button input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; }
.status { margin:0; padding:var(--padding, 0.5rem); border-radius:var(--corners, 3px); background-color:var(--color-info); color:var(--color-info-offset); }
.status[data-theme=danger] { background-color:var(--color-danger); color:var(--color-danger-offset); }
</style>
`
    });
}
