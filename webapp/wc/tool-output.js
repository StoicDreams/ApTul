/*!
 * Ap Tul Tool Output
 * Shows a tool's text result with Copy and Download buttons.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-tool-output label="Formatted JSON" language="json" filename="formatted.json" mime="application/json"></app-tool-output>
     *
     * Add inline for a short, one-line result, such as one color format or one hash: the label, the value, and Copy
     * share one row. Set --tool-output-label-width on a parent so the values of several outputs line up.
     *
     * Set the result with setValue(text), or with data-subscribe="key". An empty value hides the output.
     * Copy copies the exact text. webui-code's own copy button copies its rendered text instead, which turns
     * tabs into spaces and trims whitespace, so it is turned off here. Download only shows when a filename is set.
     */
    webui.define('app-tool-output', {
        preload: 'code button flex',
        // language, not lang: lang is the HTML attribute for a human language, which screen readers act on.
        // lang still works, for older markup.
        attr: ['label', 'language', 'lang', 'filename', 'mime'],
        flags: ['inline'],
        constructor() {
            const t = this;
            t.value = '';
            t._code = t.template.querySelector('webui-code');
            t._label = t.template.querySelector('.label');
            t._value = t.template.querySelector('.value');
            t._copy = t.template.querySelector('webui-button.copy');
            t._download = t.template.querySelector('webui-button.download');
            t._copy.addEventListener('click', _ => t.copy());
            t._download.addEventListener('click', _ => t.download());
        },
        attrChanged(property, value) {
            const t = this;
            switch (property) {
                case 'label':
                    t._code.setAttribute('label', value || '');
                    t._label.innerText = value || '';
                    break;
                case 'language':
                case 'lang':
                    t._code.setAttribute('language', value || 'text');
                    break;
                case 'filename':
                    t._download.style.display = value ? '' : 'none';
                    break;
            }
        },
        connected() {
            const t = this;
            if (!t.filename) t._download.style.display = 'none';
            t.render();
        },
        setValue(value) {
            const t = this;
            const text = value === undefined || value === null ? '' : `${value}`;
            if (text === t.value) return;
            t.value = text;
            t.render();
        },
        getValue() {
            return this.value;
        },
        async render() {
            const t = this;
            t.toggleAttribute('empty', !t.value);
            // webui-code loads on demand, so it may not be ready the first time a result arrives.
            const value = t.value;
            t._value.textContent = value;
            await customElements.whenDefined('webui-code');
            if (value !== t.value) return;
            t._code.setValue(value);
        },
        /** Copy the exact result, then confirm on the button for a moment. */
        async copy() {
            const t = this;
            if (!t.value) return;
            await webui.copyToClipboard(t.value);
            t._copy.innerText = 'Copied';
            clearTimeout(t._copyTimer);
            t._copyTimer = setTimeout(() => t._copy.innerText = 'Copy', 1500);
        },
        /** Save the current result as a file, named by the filename attribute. */
        download() {
            const t = this;
            if (!t.value || !t.filename) return;
            const blob = new Blob([t.value], { type: t.mime || 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = webui.create('a', { href: url, download: t.filename });
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        shadowTemplate: `
<div class="layout">
<span class="label"></span>
<webui-code language="text" nocopy></webui-code>
<code class="value"></code>
<webui-flex class="buttons" justify="end" gap="var(--padding)">
<webui-button class="copy" theme="secondary">Copy</webui-button>
<webui-button class="download" theme="primary">Download</webui-button>
</webui-flex>
</div>
<style type="text/css">
:host { display:block; }
:host([empty]) { display:none; }
.layout { display:flex; flex-direction:column; gap:var(--padding); }
.label, .value { display:none; }
:host([inline]) .layout {
display:grid;
grid-template-columns:var(--tool-output-label-width, 6rem) minmax(0, 1fr) auto;
align-items:center;
gap:0.25rem var(--padding);
}
:host([inline]) webui-code { display:none; }
:host([inline]) .label { display:block; font-weight:bold; }
:host([inline]) .value {
display:block;
padding:0.4em 0.6em;
border-radius:var(--border-radius, 4px);
background-color:rgba(0, 0, 0, 0.25);
font-family:ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
overflow-wrap:anywhere;
user-select:all;
}
@media (max-width: 480px) {
:host([inline]) .layout { grid-template-columns:minmax(0, 1fr) auto; }
:host([inline]) .label { grid-column:1 / -1; }
}
</style>
`
    });
}
