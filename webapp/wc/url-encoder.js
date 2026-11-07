/*!
 * Ap Tul URL Encoder and Decoder
 * Percent-encodes and decodes URLs and URL parts in the browser.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /**
     * component: encode everything that is not safe inside one URL part, such as a query value.
     * full: encode a whole URL, keeping characters such as : / ? & = that give it structure.
     * decode: reverse either one. With plusAsSpace, + is read as a space, as in submitted form data.
     */
    function convert(text, mode, plusAsSpace) {
        switch (mode) {
            case 'full':
                return encodeURI(text);
            case 'decode':
                try {
                    return decodeURIComponent(plusAsSpace ? text.replace(/\+/g, ' ') : text);
                } catch {
                    throw new Error('The text has a % that is not followed by a valid encoded character, such as %20. Write a literal % sign as %25.');
                }
            default:
                return encodeURIComponent(text);
        }
    }

    webui.define('app-url-encoder', {
        preload: 'flex input-message dropdown alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const options = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'center' });
            const mode = webui.create('webui-dropdown', {
                label: 'Mode',
                options: 'Encode a URL part|component,Encode a full URL|full,Decode|decode',
                value: 'component',
                style: 'flex:1 1 14rem; max-width:22rem;',
            });
            const plus = webui.create('webui-dropdown', {
                label: 'Plus signs',
                options: 'Keep as +|keep,Read as spaces|space',
                value: 'keep',
                style: 'flex:1 1 14rem; max-width:22rem;',
            });
            plus.style.display = 'none';
            options.append(mode, plus);
            const input = webui.create('webui-input-message', { label: 'Text', placeholder: 'Type or paste text to encode', rows: 6 });
            const status = webui.create('webui-alert', { show: false });
            const output = webui.create('app-tool-output', { label: 'Result', language: 'text' });
            wrap.append(options, input, status, output);
            t.replaceChildren(wrap);

            const update = () => {
                status.removeAttribute('show');
                const decoding = mode.value === 'decode';
                plus.style.display = decoding ? '' : 'none';
                input.setAttribute('placeholder', decoding ? 'Paste encoded text, such as hello%20world' : 'Type or paste text to encode');
                const text = input.value || '';
                if (!text) {
                    output.setValue('');
                    return;
                }
                try {
                    output.setValue(convert(text, mode.value, plus.value === 'space'));
                } catch (error) {
                    output.setValue('');
                    status.setValue({ text: error.message }, 'danger');
                }
            };
            // The components above load on demand. Wait for them before using their methods, then run once
            // so anything typed while they loaded is handled.
            await Promise.all(['app-tool-output', 'webui-input-message', 'webui-dropdown', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', update);
            mode.addEventListener('change', update);
            plus.addEventListener('change', update);
            update();
        },
    });
}
