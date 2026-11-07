/*!
 * Ap Tul UUID Generator
 * Generates version 4 (random) and version 7 (time-ordered) UUIDs in the browser.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    const MAX_COUNT = 1000;

    function hex(bytes) {
        return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function withHyphens(h) {
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }

    /** Version 4: 122 random bits from the browser's secure random generator. */
    function uuid4() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        return withHyphens(hex(bytes));
    }

    /** Version 7 (RFC 9562): a 48-bit Unix time in milliseconds, then random bits, so values sort by creation time. */
    function uuid7(time) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        let ms = time;
        for (let i = 5; i >= 0; i--) {
            bytes[i] = ms % 256;
            ms = Math.floor(ms / 256);
        }
        bytes[6] = (bytes[6] & 0x0f) | 0x70;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        return withHyphens(hex(bytes));
    }

    /** Apply the chosen format to a lowercase, hyphenated UUID. */
    function format(uuid, style) {
        let value = style.hyphens ? uuid : uuid.replace(/-/g, '');
        if (style.upper) value = value.toUpperCase();
        if (style.braces) value = `{${value}}`;
        return value;
    }

    /**
     * Generate a list of UUIDs. Version 7 values made in the same millisecond share a timestamp,
     * so they are sorted to keep the list in a stable order.
     */
    function generate(count, version, style) {
        const now = Date.now();
        let list = [];
        for (let i = 0; i < count; i++) {
            list.push(version === '7' ? uuid7(now) : uuid4());
        }
        if (version === '7') list.sort();
        return list.map(uuid => format(uuid, style));
    }

    webui.define('app-uuid-generator', {
        preload: 'flex input-text dropdown button',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const options = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'end' });
            const version = webui.create('webui-dropdown', {
                label: 'Version',
                options: 'Version 4 (random)|4,Version 7 (time-ordered)|7',
                value: '4',
                style: 'flex:1 1 14rem; max-width:22rem;',
            });
            const count = webui.create('webui-input-text', {
                label: 'How many',
                type: 'number',
                min: 1,
                max: MAX_COUNT,
                value: 1,
                style: 'width:12ch;',
            });
            const casing = webui.create('webui-dropdown', { label: 'Letters', options: 'Lowercase|lower,Uppercase|upper', value: 'lower', style: 'flex:1 1 14rem; max-width:22rem;' });
            const hyphens = webui.create('webui-dropdown', { label: 'Hyphens', options: 'With hyphens|yes,Without hyphens|no', value: 'yes', style: 'flex:1 1 14rem; max-width:22rem;' });
            const braces = webui.create('webui-dropdown', { label: 'Braces', options: 'None|no,{Braces}|yes', value: 'no', style: 'flex:1 1 14rem; max-width:22rem;' });
            const button = webui.create('webui-button', { theme: 'primary', text: 'Generate' });
            options.append(version, count, casing, hyphens, braces, button);
            const output = webui.create('app-tool-output', { label: 'UUIDs', language: 'text', filename: 'uuids.txt' });
            wrap.append(options, output);
            t.replaceChildren(wrap);

            const run = () => {
                const n = Math.min(MAX_COUNT, Math.max(1, parseInt(count.value) || 1));
                const style = { upper: casing.value === 'upper', hyphens: hyphens.value !== 'no', braces: braces.value === 'yes' };
                output.setAttribute('label', n === 1 ? 'UUID' : `${n} UUIDs`);
                output.setValue(generate(n, version.value, style).join('\n'));
            };
            // The components above load on demand. Wait for them before using their methods, then run once
            // so anything typed while they loaded is handled.
            await Promise.all(['app-tool-output', 'webui-input-text', 'webui-dropdown', 'webui-button'].map(tag => customElements.whenDefined(tag)));
            button.addEventListener('click', run);
            [version, casing, hyphens, braces].forEach(el => el.addEventListener('change', run));
            count.addEventListener('change', run);
            // Show one straight away, so the page is useful before any clicks.
            run();
        },
    });
}
