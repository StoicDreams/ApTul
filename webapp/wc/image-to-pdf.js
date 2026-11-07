/*!
 * Ap Tul Image to PDF
 * Puts photos and images into a PDF, one per page, without uploading them.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-image-to-pdf></app-image-to-pdf>
     *
     * Rust builds the PDF in the worker. JPG photos go in unchanged, so they keep their quality and size.
     * Other formats are stored without loss, and transparent areas stay transparent.
     */
    const IMAGE_TYPES = '.jpg,.jpeg,.png,.webp,.bmp,.ico,image/jpeg,image/png,image/webp,image/bmp,image/x-icon';

    function pack(files) {
        const data = new Uint8Array(files.reduce((sum, f) => sum + f.bytes.length, 0));
        let offset = 0;
        for (const file of files) {
            data.set(file.bytes, offset);
            offset += file.bytes.length;
        }
        return { data, lengths: new Uint32Array(files.map(f => f.bytes.length)) };
    }

    function save(bytes, filename) {
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const link = webui.create('a', { href: url, download: filename });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    webui.define('app-image-to-pdf', {
        preload: 'flex dropdown button alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const list = webui.create('app-file-list', { accept: IMAGE_TYPES, label: 'or drop images here', button: 'Choose Images' });
            const row = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:var(--padding); align-items:end;' });
            const page = webui.create('webui-dropdown', {
                label: 'Page Size', value: 'a4', style: 'flex:1 1 12rem; max-width:18rem;',
                options: 'A4|a4,US Letter|letter,Same as image|fit',
            });
            const margin = webui.create('webui-dropdown', {
                label: 'Margin', value: '36', style: 'flex:1 1 12rem; max-width:18rem;',
                options: 'None|0,Small (¼ inch)|18,Normal (½ inch)|36,Large (1 inch)|72',
            });
            row.append(page, margin);
            const actions = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:var(--padding);' });
            const create = webui.create('webui-button', { theme: 'primary', text: 'Create PDF', class: 'create' });
            const clear = webui.create('webui-button', { theme: 'secondary', text: 'Clear', class: 'clear' });
            actions.append(create, clear);
            const status = webui.create('webui-alert', { show: false });
            wrap.append(list, row, actions, status);
            t.replaceChildren(wrap);

            const run = async () => {
                const files = list.value;
                if (!files.length) {
                    status.setValue({ text: 'Add at least one image.' }, 'warning');
                    return;
                }
                status.setValue({ text: `Creating a PDF of ${plural(files.length, 'image')}…` }, 'info');
                try {
                    const { data, lengths } = pack(files);
                    const pdf = await webui.worker.images_to_pdf_file(data, lengths, page.value || 'a4', parseFloat(margin.value) || 0);
                    const name = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') : 'images';
                    save(pdf, `${name}.pdf`);
                    status.setValue({ text: `Created a PDF of ${plural(files.length, 'page')} (${webui.formatBytes(pdf.length)}). Your download has started.` }, 'success');
                } catch (error) {
                    // Errors name the image by its place in the list, so add its file name.
                    const text = `${error}`.replace(/^Image (\d+)/, (m, n) => files[n - 1] ? files[n - 1].name : m);
                    status.setValue({ text }, 'danger');
                }
            };
            await Promise.all(['app-file-list', 'webui-dropdown', 'webui-button', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            list.addEventListener('change', () => status.removeAttribute('show'));
            list.addEventListener('rejected', ev => status.setValue({ text: `Skipped files that are not supported images: ${ev.detail.join(', ')}.` }, 'warning'));
            create.addEventListener('click', run);
            clear.addEventListener('click', () => list.clear());
        },
    });
}
