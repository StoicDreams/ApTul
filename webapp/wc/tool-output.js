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
     * <app-tool-output label="Formatted JSON" lang="json" filename="formatted.json" mime="application/json"></app-tool-output>
     *
     * Set the result with setValue(text), or with data-subscribe="key". An empty value hides the output.
     * The Copy button comes from webui-code. Download only shows when a filename is set.
     */
    webui.define('app-tool-output', {
        preload: 'code button flex',
        attr: ['label', 'lang', 'filename', 'mime'],
        constructor() {
            const t = this;
            t.value = '';
            t._code = t.template.querySelector('webui-code');
            t._download = t.template.querySelector('webui-button');
            t._download.addEventListener('click', _ => t.download());
        },
        attrChanged(property, value) {
            const t = this;
            switch (property) {
                case 'label':
                    t._code.setAttribute('label', value || '');
                    break;
                case 'lang':
                    t._code.setAttribute('lang', value || 'text');
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
            await customElements.whenDefined('webui-code');
            if (value !== t.value) return;
            t._code.setValue(value);
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
<webui-flex column gap="var(--padding)">
<webui-code lang="text"></webui-code>
<webui-flex justify="end">
<webui-button theme="primary">Download</webui-button>
</webui-flex>
</webui-flex>
<style type="text/css">
:host { display:block; }
:host([empty]) { display:none; }
</style>
`
    });
}
