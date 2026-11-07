/*!
 * Ap Tul Base64 Encoder and Decoder
 * Encodes and decodes Base64 text, and encodes files, in the browser.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /** Base64 for a byte array. Works in chunks so large files do not overflow the call stack. */
    function bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }

    function toUrlSafe(base64) {
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    /** Encode text as UTF-8, then Base64. */
    function encodeText(text, urlSafe) {
        const base64 = bytesToBase64(new TextEncoder().encode(text));
        return urlSafe ? toUrlSafe(base64) : base64;
    }

    /**
     * Decode Base64 (standard or URL-safe, with or without padding or line breaks) to UTF-8 text.
     * Throws when the input is not Base64, or the bytes are not valid UTF-8 text.
     */
    function decodeText(input) {
        let base64 = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        if (/[^A-Za-z0-9+/=]/.test(base64)) throw new Error('The input contains characters that are not used in Base64.');
        base64 = base64.replace(/=+$/, '');
        if (base64.length % 4 === 1) throw new Error('The input is not a complete Base64 value.');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch {
            throw new Error('The decoded data is not text. It may be a file, such as an image.');
        }
    }

    webui.define('app-base64-tool', {
        preload: 'flex input-message dropdown alert file-select',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const options = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'center' });
            const mode = webui.create('webui-dropdown', { label: 'Mode', options: 'Encode|encode,Decode|decode', value: 'encode', style: 'flex:1 1 14rem; max-width:22rem;' });
            const variant = webui.create('webui-dropdown', { label: 'Alphabet', options: 'Standard|standard,URL-safe|url', value: 'standard', style: 'flex:1 1 14rem; max-width:22rem;' });
            const fileSelect = webui.create('webui-file-select', { label: 'Encode a File' });
            options.append(mode, variant, fileSelect);
            const drop = webui.create('app-file-drop', { read: 'dataurl', label: 'Drop a file to encode it' });
            const input = webui.create('webui-input-message', { label: 'Text', placeholder: 'Type or paste text to encode', rows: 8 });
            drop.appendChild(input);
            const status = webui.create('webui-alert', { show: false });
            const output = webui.create('app-tool-output', { label: 'Base64', language: 'text', filename: 'base64.txt' });
            wrap.append(options, drop, status, output);
            t.replaceChildren(wrap);

            const showError = message => status.setValue({ text: message }, 'danger');
            const update = () => {
                status.removeAttribute('show');
                const decoding = mode.value === 'decode';
                input.setAttribute('label', decoding ? 'Base64' : 'Text');
                input.setAttribute('placeholder', decoding ? 'Paste Base64 to decode' : 'Type or paste text to encode');
                output.setAttribute('label', decoding ? 'Decoded Text' : 'Base64');
                output.filename = decoding ? 'decoded.txt' : 'base64.txt';
                const text = input.value || '';
                if (!text) {
                    output.setValue('');
                    return;
                }
                try {
                    output.setValue(decoding ? decodeText(text) : encodeText(text, variant.value === 'url'));
                } catch (error) {
                    output.setValue('');
                    showError(error.message);
                }
            };
            /** Encode a chosen or dropped file. Most arrive as data URLs, but webui-file-select reads text files as text. */
            const encodeFile = file => {
                if (!file) return;
                const content = `${file.content}`;
                const base64 = content.startsWith('data:') ? content.slice(content.indexOf(',') + 1) : encodeText(content, false);
                status.setValue({ text: `Encoded ${file.name} (${webui.formatBytes(file.size)}).` }, 'success');
                output.setAttribute('label', `Base64 of ${file.name}`);
                output.filename = `${file.name}.base64.txt`;
                output.setValue(variant.value === 'url' ? toUrlSafe(base64) : base64);
            };
            // The components above load on demand. Wait for them before using their methods, then run once
            // so anything typed while they loaded is handled.
            await Promise.all(['app-tool-output', 'app-file-drop', 'webui-input-message', 'webui-dropdown', 'webui-alert', 'webui-file-select'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', update);
            mode.addEventListener('change', update);
            variant.addEventListener('change', update);
            drop.addEventListener('change', () => encodeFile(drop.value[0]));
            fileSelect.addEventListener('change', () => encodeFile(fileSelect.value[0]));
            update();
        },
    });
}
