/*!
 * Ap Tul Image to Base64
 * Turns an image into a Base64 data URL, with ready-to-paste HTML and CSS.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    // Data URLs above this size slow pages down, so the tool suggests a normal image file instead.
    const LARGE = 100 * 1024;
    const IMAGE_TYPES = '.png,.jpg,.jpeg,.gif,.webp,.svg,.ico,.bmp,.avif,image/*';

    const attr = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    /** Every snippet shown for an image, in display order. */
    function snippets(file) {
        const dataUrl = `${file.content}`;
        const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
        const alt = attr(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        return [
            ['Data URL', 'text', dataUrl],
            ['Base64 only', 'text', base64],
            ['HTML image tag', 'html', `<img src="${dataUrl}" alt="${alt}">`],
            ['CSS background', 'css', `background-image: url("${dataUrl}");`],
        ];
    }

    webui.define('app-image-to-base64', {
        preload: 'flex file-select alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const drop = webui.create('app-file-drop', { accept: IMAGE_TYPES, read: 'dataurl', label: 'Drop an image' });
            const pick = webui.create('div', {
                style: 'display:flex; flex-direction:column; align-items:center; gap:var(--padding); padding:calc(var(--padding) * 2); border:2px dashed #888; border-radius:var(--border-radius, 4px);',
            });
            const fileSelect = webui.create('webui-file-select', { label: 'Choose an Image', accept: IMAGE_TYPES });
            const hint = webui.create('p', { text: 'or drop an image here', style: 'margin:0;' });
            const preview = webui.create('img', { alt: '', class: 'image-preview', style: 'max-width:100%; max-height:240px; display:none;' });
            pick.append(fileSelect, hint, preview);
            drop.appendChild(pick);
            const status = webui.create('webui-alert', { show: false });
            const results = webui.create('div', { class: 'base64-results', style: 'display:none; flex-direction:column; gap:var(--padding);' });
            const codes = snippets({ content: 'data:,', name: '' }).map(([label, lang]) => {
                const code = webui.create('app-tool-output', { language: 'text', label, 'data-snippet': label });
                results.appendChild(code);
                return code;
            });
            wrap.append(drop, status, results);
            t.replaceChildren(wrap);

            const show = file => {
                status.removeAttribute('show');
                if (!file) {
                    results.style.display = 'none';
                    preview.style.display = 'none';
                    return;
                }
                if (!`${file.content}`.startsWith('data:image/')) {
                    results.style.display = 'none';
                    preview.style.display = 'none';
                    status.setValue({ text: `${file.name} is not an image this browser can read.` }, 'danger');
                    return;
                }
                snippets(file).forEach(([, , value], i) => codes[i].setValue(value));
                preview.src = file.content;
                preview.alt = file.name;
                preview.style.display = '';
                results.style.display = 'flex';
                const length = `${file.content}`.length;
                const message = `${file.name}: ${webui.formatBytes(file.size)} as a file, ${webui.formatBytes(length)} as a data URL.`;
                if (length > LARGE) {
                    status.setValue({ text: `${message} That is large for a data URL, which can slow pages down. A normal image file is usually better at this size.` }, 'warning');
                } else {
                    status.setValue({ text: message }, 'success');
                }
            };
            await Promise.all(['app-file-drop', 'webui-file-select', 'webui-alert', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            // The file select sits inside the drop zone, and its change bubbles through it, so only handle real drops here.
            drop.addEventListener('change', ev => { if (ev.target === drop) show(drop.value[0]); });
            // The framework can send change before the file is read, while value is still undefined.
            fileSelect.addEventListener('change', () => { if (fileSelect.value && fileSelect.value[0]) show(fileSelect.value[0]); });
        },
    });
}
