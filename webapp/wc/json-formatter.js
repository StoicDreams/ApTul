/*!
 * Ap Tul JSON Formatter
 * Formats, minifies, and validates JSON in the browser.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    const INDENTS = { '2': 2, '4': 4, 'tab': '\t', 'min': 0 };

    /** Line and column (from 1) of a character position in text. */
    function lineAndColumn(text, position) {
        const before = text.slice(0, position);
        const line = before.split('\n').length;
        const column = position - before.lastIndexOf('\n');
        return { line, column };
    }

    /** A readable message for a JSON.parse error, with the line and column when the browser reports a position. */
    function describeError(text, error) {
        const message = `${error.message || error}`;
        const lineMatch = message.match(/line (\d+) column (\d+)/);
        if (lineMatch) return message;
        const positionMatch = message.match(/position (\d+)/);
        if (positionMatch) {
            const { line, column } = lineAndColumn(text, parseInt(positionMatch[1]));
            return `${message} (line ${line}, column ${column})`;
        }
        return message;
    }

    function sortKeys(value) {
        if (Array.isArray(value)) return value.map(sortKeys);
        if (value && typeof value === 'object') {
            return Object.keys(value).sort().reduce((sorted, key) => {
                sorted[key] = sortKeys(value[key]);
                return sorted;
            }, {});
        }
        return value;
    }

    /**
     * Format JSON text. Returns { ok, output, error }.
     * indent: "2", "4", "tab", or "min" for minified. sort: true to sort object keys.
     */
    function formatJson(text, indent, sort) {
        if (!text.trim()) return { ok: true, output: '', error: '' };
        try {
            let value = JSON.parse(text);
            if (sort) value = sortKeys(value);
            const space = INDENTS[indent] ?? 2;
            return { ok: true, output: JSON.stringify(value, null, space), error: '' };
        } catch (error) {
            return { ok: false, output: '', error: describeError(text, error) };
        }
    }

    webui.define('app-json-formatter', {
        preload: 'flex input-message dropdown alert',
        // app-file-drop and app-tool-output load from this site on demand.
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const drop = webui.create('app-file-drop', { accept: '.json,application/json,text/*', read: 'text', label: 'Drop a JSON file' });
            const input = webui.create('webui-input-message', {
                label: 'JSON',
                placeholder: 'Paste JSON here, or drop a .json file',
                rows: 10,
            });
            drop.appendChild(input);
            const options = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'center' });
            const indent = webui.create('webui-dropdown', {
                label: 'Output',
                options: '2 spaces|2,4 spaces|4,Tabs|tab,Minified|min',
                value: '2',
                style: 'flex:1 1 14rem; max-width:22rem;',
            });
            const sort = webui.create('webui-dropdown', {
                label: 'Keys',
                options: 'Keep order|keep,Sort A to Z|sort',
                value: 'keep',
                style: 'flex:1 1 14rem; max-width:22rem;',
            });
            options.append(indent, sort);
            const status = webui.create('webui-alert', { show: false });
            const output = webui.create('app-tool-output', {
                label: 'Result',
                lang: 'json',
                filename: 'formatted.json',
                mime: 'application/json',
            });
            wrap.append(drop, options, status, output);
            t.replaceChildren(wrap);

            const update = () => {
                const text = input.value || '';
                const result = formatJson(text, indent.value, sort.value === 'sort');
                output.setValue(result.output);
                output.filename = indent.value === 'min' ? 'minified.json' : 'formatted.json';
                if (!text.trim()) {
                    status.removeAttribute('show');
                } else if (result.ok) {
                    // Pass an object: the alert shows text with innerText, but would try to parse a plain string as JSON.
                    status.setValue({ text: 'Valid JSON' }, 'success');
                } else {
                    // Browser error messages quote part of the input, so this must stay text.
                    status.setValue({ text: `Invalid JSON: ${result.error}` }, 'danger');
                }
            };
            // The components above load on demand. Wait for them before using their methods, then run once
            // so anything typed while they loaded is handled.
            await Promise.all(['app-tool-output', 'app-file-drop', 'webui-input-message', 'webui-dropdown', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', update);
            indent.addEventListener('change', update);
            sort.addEventListener('change', update);
            drop.addEventListener('change', () => {
                const file = drop.value[0];
                if (!file) return;
                input.setValue(file.content);
                update();
            });
            update();
        },
    });
}
