/*!
 * Image Converter
 * A component for resizing and converting image formats.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-image-converter></app-image-converter>
     * <app-image-converter to="webp" quality="0.8"></app-image-converter>
     *
     * to: the format chosen when the page opens: webp, jpg, png, ico, bmp, or same (keep the original format).
     * quality: the starting JPG and WebP quality, from 0.5 to 0.95.
     *
     * Rust resizes the image (Lanczos3) in the worker. JPG and WebP are then saved by the browser, which can make
     * smaller, lossy files at a chosen quality. The Rust image crate only writes lossless WebP, which is often larger
     * than the original JPG. Browsers that cannot save WebP fall back to the lossless Rust version, with a note.
     */
    const FORMATS = {
        jpg: { mime: 'image/jpeg', ext: 'jpg' },
        webp: { mime: 'image/webp', ext: 'webp' },
        png: { mime: 'image/png', ext: 'png' },
        ico: { mime: 'image/x-icon', ext: 'ico' },
        bmp: { mime: 'image/bmp', ext: 'bmp' },
    };
    // ICO files store at most 256 x 256 pixels.
    const ICO_MAX = 256;

    /** The converter format for a file's MIME type, used by "Same as original". */
    function formatOf(type) {
        switch ((type || '').toLowerCase()) {
            case 'image/jpeg': return 'jpg';
            case 'image/webp': return 'webp';
            case 'image/bmp': return 'bmp';
            case 'image/x-icon':
            case 'image/vnd.microsoft.icon': return 'ico';
            default: return 'png';
        }
    }

    let webpSupport = null;
    /** Whether this browser can save canvas images as WebP. Safari before version 17 cannot. */
    function canEncodeWebp() {
        if (webpSupport === null) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        }
        return webpSupport;
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject('The image could not be read. It may be damaged, or in a format this browser cannot open.');
            img.src = src;
        });
    }

    /** Save an image as lossy JPG or WebP at a quality from 0 to 1. JPG has no transparency, so it gets a white background. */
    async function encodeWithCanvas(src, format, quality, width, height) {
        const img = await loadImage(src);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (format === 'jpg') {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
        }
        context.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL(FORMATS[format].mime, quality);
    }

    function dataUrlToBlob(dataUrl) {
        const [head, base64] = dataUrl.split(',');
        const mime = head.split(':')[1].split(';')[0];
        const binary = atob(base64);
        return new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))], { type: mime });
    }

    webui.define("app-image-converter", {
        linkCss: true,
        preload: 'button flex side-by-side page-segment file-preview file-select dropdown input-text',
        attr: ['to', 'quality'],
        width: 100,
        height: 100,
        sourceFile: null,
        resize: 'Auto',
        constructor() {
            const t = this;
            t._msgSelect = t.template.querySelector('.msgSelected');
            t._msgConvert = t.template.querySelector('.msgConverted');
            t._note = t.template.querySelector('.convertNote');
            t._resize = t.template.querySelector('webui-dropdown[label="Resize To"]');
            t._format = t.template.querySelector('webui-dropdown[label="Convert To"]');
            t._quality = t.template.querySelector('webui-dropdown[label="Quality"]');
            t._resizeValue = t.template.querySelector('webui-input-text');
            t._resizeValue.style.display = 'none';
            t._fileSelect = t.template.querySelector('webui-file-select');
            t._selectedFilePreview = t.template.querySelector('[name="selectedFilePreview"]');
            t._convertedFilePreview = t.template.querySelector('[name="convertedFilePreview"]');
            t._download = t.template.querySelector('webui-button.download');
            t._download.style.display = 'none';
            t._download.addEventListener('click', _ => t.download());
            t._fileSelect.addEventListener('change', ev => {
                t.setValue(t._fileSelect.value);
            });
            // Dropping an image anywhere on the tool works the same as choosing it with the button.
            t._fileDrop = t.template.querySelector('app-file-drop');
            t._fileDrop.addEventListener('change', ev => {
                t._fileSelect.setValue(t._fileDrop.value);
                t.setValue(t._fileDrop.value);
            });
            t._resize.addEventListener('change', _ => {
                t.resize = t._resize.value;
                switch (t.resize) {
                    case 'Auto':
                        t._resizeValue.style.display = 'none';
                        break;
                    case 'Width':
                        t._resizeValue.style.display = '';
                        t._resizeValue.value = t.width;
                        break;
                    case 'Height':
                        t._resizeValue.style.display = '';
                        t._resizeValue.value = t.height;
                        break;
                }
                t.applyTransition();
            });
            t._format.addEventListener('change', _ => {
                t.showQuality();
                t.applyTransition();
            });
            t._quality.addEventListener('change', _ => {
                t.applyTransition();
            });
            t._resizeValue.addEventListener('change', _ => {
                t.applyTransition();
            });
        },
        attrChanged(property, value) {
            const t = this;
            switch (property) {
                // These arrive before the dropdowns have loaded, so set their value attribute, which they apply once ready.
                case 'to':
                    if (value && (FORMATS[value] || value === 'same')) t._format.setAttribute('value', value);
                    break;
                case 'quality':
                    if (value) t._quality.setAttribute('value', value);
                    break;
            }
        },
        async connected() {
            const t = this;
            await customElements.whenDefined('webui-dropdown');
            t.showQuality();
        },
        /** The format to save as, with "Same as original" resolved from the chosen file. */
        targetFormat() {
            const t = this;
            const chosen = t._format.value || 'webp';
            return chosen === 'same' ? formatOf(t.sourceFile?.type) : chosen;
        },
        /** Quality only applies to the lossy formats. */
        showQuality() {
            const t = this;
            const format = t.targetFormat();
            t._quality.style.display = format === 'jpg' || format === 'webp' ? '' : 'none';
        },
        async setValue(value) {
            const t = this;
            try {
                t.sourceFile = (value || [])[0];
                if (!t.sourceFile) {
                    t._msgSelect.innerText = '';
                    t._msgConvert.innerText = '';
                    t._note.innerText = '';
                    t._download.style.display = 'none';
                    t._selectedFilePreview.clear();
                    t._convertedFilePreview.clear();
                    return;
                }
                t._msgSelect.innerText = `Processing...`;
                const img = await loadImage(t.sourceFile.content);
                t.width = img.naturalWidth;
                t.height = img.naturalHeight;
                const size = webui.getBase64Size(t.sourceFile.content);
                t._msgSelect.innerHTML = `Dimensions: ${t.width} x ${t.height} <webui-flex grow></webui-flex> Size: ${webui.formatBytes(size)}`;
                t._selectedFilePreview.setFile(value);
                t.showQuality();
                t.applyTransition();
            } catch (ex) {
                t._msgSelect.innerText = ex;
                t._convertedFilePreview.clear();
            }
        },
        async applyTransition() {
            const t = this;
            if (!t.sourceFile || !t.sourceFile.content || !t.sourceFile.content.startsWith('data')) return;
            const run = t._run = (t._run || 0) + 1;
            t._converted = null;
            t._download.style.display = 'none';
            t._note.innerText = '';
            try {
                let height = t.height;
                let width = t.width;
                switch (t._resize.value) {
                    case 'Width':
                        width = parseInt(t._resizeValue.value) || width;
                        height = Math.max(1, Math.round(width * (t.height / t.width)));
                        break;
                    case 'Height':
                        height = parseInt(t._resizeValue.value) || height;
                        width = Math.max(1, Math.round(height * (t.width / t.height)));
                        break;
                }
                const format = t.targetFormat();
                const notes = [];
                if (format === 'ico' && (width > ICO_MAX || height > ICO_MAX)) {
                    const scale = ICO_MAX / Math.max(width, height);
                    width = Math.max(1, Math.round(width * scale));
                    height = Math.max(1, Math.round(height * scale));
                    notes.push(`ICO files can be at most ${ICO_MAX} pixels wide or tall, so the image was scaled down to fit.`);
                }
                t._msgConvert.innerText = `Processing...`;
                t._convertedFilePreview.clear();
                const quality = parseFloat(t._quality.value) || 0.8;
                const lossy = format === 'jpg' || (format === 'webp' && canEncodeWebp());
                let converted = await webui.worker.process_image(t.sourceFile.content, width, height, lossy ? 'png' : format);
                if (converted.startsWith('data') && lossy) {
                    converted = await encodeWithCanvas(converted, format, quality, width, height);
                }
                if (run !== t._run) return;
                if (format === 'webp' && !lossy) {
                    notes.push('This browser cannot save smaller, lossy WebP files, so this WebP is lossless and may be larger than the original. Chrome, Edge, Firefox, and Safari 17 or later can make smaller WebP files.');
                }
                if (format === 'jpg' && t.sourceFile.type === 'image/png') {
                    notes.push('JPG has no transparency, so any see-through areas are now white.');
                }
                if (converted.startsWith('data')) {
                    const size = webui.getBase64Size(converted);
                    const original = webui.getBase64Size(t.sourceFile.content);
                    if (size > original && (format === 'jpg' || format === 'webp')) {
                        notes.push('The new file is larger than the original. Try a lower quality, or keep the original format.');
                    }
                    t._msgConvert.innerHTML = `Dimensions: ${width} x ${height} <webui-flex grow></webui-flex> Size: ${webui.formatBytes(size)}`;
                    t._convertedFilePreview.setFile([{
                        content: converted,
                        type: converted.split(';')[0].split(':')[1],
                    }]);
                    t._converted = { content: converted, format };
                    t._download.style.display = '';
                } else {
                    t._msgConvert.innerText = converted;
                    t._convertedFilePreview.clear();
                }
                t._note.innerText = notes.join(' ');
            } catch (ex) {
                if (run !== t._run) return;
                t._msgConvert.innerText = `${ex}`;
                t._convertedFilePreview.clear();
            }
        },
        /** Save the converted image, named after the original file with the new extension. */
        download() {
            const t = this;
            if (!t._converted) return;
            const base = (t.sourceFile?.name || 'image').replace(/\.[^.]+$/, '') || 'image';
            const url = URL.createObjectURL(dataUrlToBlob(t._converted.content));
            const link = webui.create('a', { href: url, download: `${base}.${FORMATS[t._converted.format].ext}` });
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        shadowTemplate: `
<style type="text/css">
:host {
display:flex;
position:relative;
box-sizing:border-box;
}
.convertNote:empty { display:none; }
</style>
<app-file-drop class="mx-a" accept=".png,.jpg,.jpeg,.webp,.ico,.bmp" read="dataurl" label="Drop an image to convert">
<webui-flex column class="mx-a">
<webui-flex elevation="10" align="center" justify="center" wrap>
<webui-dropdown label="Resize To" options="No Resize:Auto,Width,Height"></webui-dropdown>
<webui-input-text max="5000" min="1" type="number"></webui-input-text>
<webui-dropdown label="Convert To" options="WebP|webp,JPG|jpg,PNG|png,ICO|ico,BMP|bmp,Same as original|same" value="webp"></webui-dropdown>
<webui-dropdown label="Quality" options="Best (95)|0.95,High (90)|0.9,Good (80)|0.8,Smaller (65)|0.65,Smallest (50)|0.5" value="0.8"></webui-dropdown>
</webui-flex>
<webui-side-by-side>
<webui-page-segment elevation="10" class="content">
<h3>Starting File - <webui-file-select label="Select or Drop an Image" accept=".png,.jpg,.jpeg,.webp,.ico,.bmp" style="font-size: var(--typography-size);"></webui-file-select></h3>
<webui-flex class="msgSelected"></webui-flex>
<webui-file-preview name="selectedFilePreview" maxHeight="500"></webui-file-preview>
</webui-page-segment>
<webui-page-segment elevation="10" class="content">
<h3>Updated File - <webui-button class="download" theme="primary">Download</webui-button></h3>
<webui-flex class="msgConverted"></webui-flex>
<p class="convertNote"></p>
<webui-file-preview name="convertedFilePreview" maxHeight="500"></webui-file-preview>
</webui-page-segment>
</webui-side-by-side>
</webui-flex>
</app-file-drop>
`
    });
}
