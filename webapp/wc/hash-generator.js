/*!
 * Ap Tul Hash Generator
 * MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes of text or files, in the browser.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    const ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

    /** MD5 of a byte array (RFC 1321). Browsers' built-in crypto does not include MD5. */
    const K = new Uint32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    function md5(bytes) {
        const length = bytes.length;
        const padded = new Uint8Array(((length + 8) >> 6 << 6) + 64);
        padded.set(bytes);
        padded[length] = 0x80;
        const view = new DataView(padded.buffer);
        view.setUint32(padded.length - 8, (length * 8) >>> 0, true);
        view.setUint32(padded.length - 4, Math.floor(length / 0x20000000), true);
        let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
        const M = new Uint32Array(16);
        for (let offset = 0; offset < padded.length; offset += 64) {
            for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true);
            let A = a0, B = b0, C = c0, D = d0;
            for (let i = 0; i < 64; i++) {
                let F, g;
                if (i < 16) { F = (B & C) | (~B & D); g = i; }
                else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
                else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
                else { F = C ^ (B | ~D); g = (7 * i) % 16; }
                F = (F + A + K[i] + M[g]) >>> 0;
                A = D; D = C; C = B;
                const s = S[(i >> 4) * 4 + (i % 4)];
                B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
            }
            a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
        }
        const out = new DataView(new ArrayBuffer(16));
        [a0, b0, c0, d0].forEach((v, i) => out.setUint32(i * 4, v, true));
        return new Uint8Array(out.buffer);
    }

    function toHex(bytes) {
        return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashAll(bytes) {
        const results = { MD5: toHex(md5(bytes)) };
        for (const name of ALGORITHMS.slice(1)) {
            results[name] = toHex(await crypto.subtle.digest(name, bytes));
        }
        return results;
    }

    webui.define('app-hash-generator', {
        preload: 'flex input-message input-text dropdown alert file-select',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const options = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'center' });
            const casing = webui.create('webui-dropdown', { label: 'Letters', options: 'Lowercase|lower,Uppercase|upper', value: 'lower', style: 'flex:1 1 14rem; max-width:22rem;' });
            const fileSelect = webui.create('webui-file-select', { label: 'Hash a File' });
            options.append(casing, fileSelect);
            const drop = webui.create('app-file-drop', { read: 'buffer', label: 'Drop a file to hash it' });
            const input = webui.create('webui-input-message', { label: 'Text', placeholder: 'Type or paste text, or drop a file here', rows: 6 });
            drop.appendChild(input);
            const compare = webui.create('webui-input-message', { label: 'Compare with', placeholder: 'Optional: paste an expected hash to check it', rows: 1 });
            const status = webui.create('webui-alert', { show: false });
            const results = webui.create('div', { class: 'hash-results', style: 'display:flex; flex-direction:column; gap:var(--padding);' });
            const codes = {};
            ALGORITHMS.forEach(name => {
                codes[name] = webui.create('app-tool-output', { language: 'text', label: name, 'data-algorithm': name });
                results.appendChild(codes[name]);
            });
            results.style.display = 'none';
            wrap.append(options, drop, compare, status, results);
            t.replaceChildren(wrap);

            let hashes = null;
            // What was hashed, for messages: "The text", or a file name.
            let source = '';
            let fileNote = '';
            let token = 0;
            const show = () => {
                status.removeAttribute('show');
                if (!hashes) {
                    results.style.display = 'none';
                    return;
                }
                const upper = casing.value === 'upper';
                results.style.display = 'flex';
                ALGORITHMS.forEach(name => codes[name].setValue(upper ? hashes[name].toUpperCase() : hashes[name]));
                const expected = (compare.value || '').trim().toLowerCase();
                if (expected) {
                    const match = ALGORITHMS.find(name => hashes[name] === expected);
                    if (match) {
                        status.setValue({ text: `Match: ${source} has this ${match} hash.` }, 'success');
                    } else {
                        status.setValue({ text: `No match: ${source} has no hash equal to the value you pasted.` }, 'danger');
                    }
                } else if (fileNote) {
                    status.setValue({ text: fileNote }, 'success');
                }
            };
            /** Hash bytes from text or a file, ignoring results that finish after newer input. */
            const hashBytes = async (bytes, label) => {
                const mine = ++token;
                const result = await hashAll(bytes);
                if (mine !== token) return;
                hashes = result;
                source = label;
                show();
            };
            const hashText = () => {
                fileNote = '';
                const text = input.value || '';
                if (!text) {
                    token++;
                    hashes = null;
                    show();
                    return;
                }
                hashBytes(new TextEncoder().encode(text), 'The text');
            };
            const hashFile = async file => {
                if (!file) return;
                let bytes;
                if (file.content instanceof ArrayBuffer) {
                    bytes = new Uint8Array(file.content);
                } else if (`${file.content}`.startsWith('data:')) {
                    bytes = new Uint8Array(await (await fetch(file.content)).arrayBuffer());
                } else {
                    bytes = new TextEncoder().encode(file.content);
                }
                input.setValue('');
                fileNote = `Hashed ${file.name} (${webui.formatBytes(file.size)}).`;
                await hashBytes(bytes, file.name);
            };
            await Promise.all(['app-file-drop', 'webui-input-message', 'webui-dropdown', 'webui-alert', 'app-tool-output', 'webui-file-select'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', hashText);
            compare.addEventListener('input', show);
            casing.addEventListener('change', show);
            drop.addEventListener('change', () => hashFile(drop.value[0]));
            fileSelect.addEventListener('change', () => hashFile(fileSelect.value[0]));
            hashText();
        },
    });
}
