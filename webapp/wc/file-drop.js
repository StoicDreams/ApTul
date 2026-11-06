/*!
 * Ap Tul File Drop
 * Lets visitors drop files onto a tool, as well as choosing them with a button.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-file-drop accept="image/*" read="dataurl" multiple>
     *     ...the tool, usually including a webui-file-select...
     * </app-file-drop>
     *
     * Dropped files are read in the same shape as webui-file-select:
     * [{ name, type, size, lastModified, content }].
     * The element's value is set to that list and a "change" event is dispatched.
     *
     * read: "auto" (default, the same rules as webui-file-select), "text", "dataurl", or "buffer".
     * accept: the same format as a file input, such as "image/*,.json". Files that do not match are skipped.
     */
    function readAs(file, mode) {
        if (mode === 'auto') {
            const major = file.type.split('/')[0];
            const textTypes = ['application/json', 'application/xml', 'application/xhtml+xml'];
            mode = major === 'text' || textTypes.includes(file.type) ? 'text' : 'dataurl';
        }
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onerror = () => {
                console.error('Failed to read file', file.name, reader.error);
                resolve(null);
            };
            reader.onload = ev => resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified,
                content: ev.target.result,
            });
            switch (mode) {
                case 'text':
                    reader.readAsText(file);
                    break;
                case 'buffer':
                    reader.readAsArrayBuffer(file);
                    break;
                default:
                    reader.readAsDataURL(file);
                    break;
            }
        });
    }
    /** True when a file matches an accept list such as "image/*,.json". An empty list accepts everything. */
    function accepts(file, accept) {
        if (!accept) return true;
        const name = file.name.toLowerCase();
        const type = (file.type || '').toLowerCase();
        return accept.split(',').map(a => a.trim().toLowerCase()).filter(Boolean).some(rule => {
            if (rule.startsWith('.')) return name.endsWith(rule);
            if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
            return type === rule;
        });
    }
    webui.define('app-file-drop', {
        attr: ['accept', 'read', 'label'],
        flags: ['multiple'],
        constructor() {
            const t = this;
            t.value = [];
            t._depth = 0;
            t._label = t.template.querySelector('.drop-label');
            t.addEventListener('dragenter', ev => {
                if (!ev.dataTransfer?.types?.includes('Files')) return;
                ev.preventDefault();
                if (t._depth++ === 0) t.setAttribute('dragging', '');
            });
            t.addEventListener('dragover', ev => {
                if (!ev.dataTransfer?.types?.includes('Files')) return;
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'copy';
            });
            t.addEventListener('dragleave', _ => {
                if (t._depth > 0 && --t._depth === 0) t.removeAttribute('dragging');
            });
            t.addEventListener('drop', ev => {
                if (!ev.dataTransfer?.files?.length) return;
                ev.preventDefault();
                t._depth = 0;
                t.removeAttribute('dragging');
                t.addFiles(ev.dataTransfer.files);
            });
        },
        attrChanged(property, value) {
            const t = this;
            switch (property) {
                case 'label':
                    t._label.innerText = value || 'Drop files here';
                    break;
            }
        },
        /** Read a FileList or array of Files, then set value and dispatch "change". */
        async addFiles(fileList) {
            const t = this;
            let files = [...fileList].filter(file => accepts(file, t.accept));
            if (!t.multiple) files = files.slice(0, 1);
            if (!files.length) {
                t.dispatchEvent(new CustomEvent('rejected', { bubbles: true, detail: { accept: t.accept } }));
                return;
            }
            const mode = ['text', 'dataurl', 'buffer'].includes(t.read) ? t.read : 'auto';
            const read = await Promise.all(files.map(file => readAs(file, mode)));
            t.value = read.filter(Boolean);
            t.dispatchEvent(new Event('change', { bubbles: true }));
        },
        getValue() {
            return this.value;
        },
        shadowTemplate: `
<slot></slot>
<div class="drop-label" aria-hidden="true">Drop files here</div>
<style type="text/css">
:host { display:block; position:relative; }
.drop-label {
display:none;
position:absolute;
inset:0;
z-index:2;
align-items:center;
justify-content:center;
border:3px dashed var(--color-primary, #888);
border-radius:var(--border-radius, 4px);
background-color:color-mix(in srgb, var(--color-background, #333) 85%, transparent);
color:var(--color-background-offset, #fff);
font-size:1.5em;
pointer-events:none;
}
:host([dragging]) .drop-label { display:flex; }
</style>
`
    });
}
