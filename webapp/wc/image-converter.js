/*!
 * Image Converter
 * A component for resizing and converting image formats.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    webui.define("app-image-converter", {
        linkCss: true,
        preload: 'button flex side-by-side page-segment file-preview file-select',
        width: 100,
        height: 100,
        sourceFile: null,
        resize: 'Auto',
        constructor() {
            const t = this;
            t._msgSelect = t.template.querySelector('.msgSelected');
            t._msgConvert = t.template.querySelector('.msgConverted');
            t._resize = t.template.querySelector('webui-dropdown[label="Resize To"]');
            t._format = t.template.querySelector('webui-dropdown[label="Convert To"]');
            t._resizeValue = t.template.querySelector('webui-input-text');
            t._resizeValue.style.display = 'none';
            t._fileSelect = t.template.querySelector('webui-file-select');
            t._selectedFilePreview = t.template.querySelector('[name="selectedFilePreview"]');
            t._convertedFilePreview = t.template.querySelector('[name="convertedFilePreview"]');
            t._button = t.template.querySelector('webui-button');
            t._span = t.template.querySelector('label > span');
            t._fileSelect.addEventListener('change', ev => {
                t.setValue(t._fileSelect.value);
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
                t.applyTransition();
            });
            t._resizeValue.addEventListener('change', _ => {
                t.applyTransition();
            });
        },
        async setValue(value) {
            const t = this;
            try {
                t.sourceFile = t._fileSelect.value[0];
                t._msgSelect.innerText = `Processing...`;
                const dimensions = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                    img.onerror = (e) => reject("Failed to load image for dimension extraction");
                    img.src = t.sourceFile.content;
                });
                t.width = dimensions.w;
                t.height = dimensions.h;
                const size = webui.getBase64Size(t.sourceFile.content);
                t._msgSelect.innerHTML = `Dimensions: ${t.width} x ${t.height} <webui-flex grow></webui-flex> Size: ${webui.formatBytes(size)}`;
                t._selectedFilePreview.setFile(value);
                t.applyTransition();
            } catch (ex) {
                t._msgSelect.innerText = ex;
                t._convertedFilePreview.clear();
            }
        },
        async applyTransition() {
            const t = this;
            if (!t.sourceFile || !t.sourceFile.content || !t.sourceFile.content.startsWith('data')) return;
            try {
                let height = t.height;
                let width = t.width;
                switch (t._resize.value) {
                    case 'Width':
                        width = parseInt(t._resizeValue.value) || width;
                        height = parseInt(width * (t.height / t.width));
                        break;
                    case 'Height':
                        height = parseInt(t._resizeValue.value) || height;
                        width = parseInt(height * (t.width / t.height));
                        break;
                }
                t._msgConvert.innerText = `Processing...`;
                t._convertedFilePreview.clear();
                let converted = await webui.worker.process_image(t.sourceFile.content, width, height, t._format.value);
                if (converted.startsWith('data')) {
                    const size = webui.getBase64Size(converted);
                    t._msgConvert.innerHTML = `Dimensions: ${width} x ${height} <webui-flex grow></webui-flex> Size: ${webui.formatBytes(size)}`;
                    t._convertedFilePreview.setFile([{
                        content: converted,
                        type: converted.split(';')[0].split(':')[1],
                    }]);
                } else {
                    t._msgConvert.innerText = converted;
                    t._convertedFilePreview.clear();
                }
            } catch (ex) {
                t._msgConvert.innerText = ex;
                t._convertedFilePreview.clear();
            }
        },
        shadowTemplate: `
<style type="text/css">
:host {
display:flex;
position:relative;
box-sizing:border-box;
}
</style>
<webui-flex column class="mx-a">
<webui-flex elevation="10" align="center" justify="center">
<webui-dropdown label="Resize To" options="No Resize:Auto,Width,Height"></webui-dropdown>
<webui-input-text max="5000" min="1" type="number"></webui-input-text>
<webui-dropdown label="Convert To" options="webp,jpg,ico,png,bmp"></webui-dropdown>
</webui-flex>
<webui-side-by-side>
<webui-page-segment elevation="10" class="content">
<h3>Starting File - <webui-file-select label="Select Image to Convert" accept=".png,.jpg,.jpeg,.webp,.ico,.bmp" style="font-size: var(--typography-size);"></webui-file-select></h3>
<webui-flex class="msgSelected"></webui-flex>
<webui-file-preview name="selectedFilePreview" maxHeight="500"></webui-file-preview>
</webui-page-segment>
<webui-page-segment elevation="10" class="content">
<h3>Updated File</h3>
<webui-flex class="msgConverted"></webui-flex>
<webui-file-preview name="convertedFilePreview" maxHeight="500"></webui-file-preview>
</webui-page-segment>
</webui-side-by-side>
</webui-flex>
`
    });
}