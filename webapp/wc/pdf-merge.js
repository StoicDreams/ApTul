/*!
 * Ap Tul PDF Merge
 * Joins PDF files into one, in the order you choose, without uploading them.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /** The worker takes one buffer, so files are joined end to end, with their lengths alongside. */
    function pack(files) {
        const total = files.reduce((sum, f) => sum + f.bytes.length, 0);
        const data = new Uint8Array(total);
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

    webui.define('app-pdf-merge', {
        preload: 'flex button alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const list = webui.create('app-file-list', { accept: '.pdf,application/pdf', label: 'or drop PDF files here', button: 'Choose PDFs' });
            const actions = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:var(--padding);' });
            const merge = webui.create('webui-button', { theme: 'primary', text: 'Merge PDFs', class: 'merge' });
            const clear = webui.create('webui-button', { theme: 'secondary', text: 'Clear', class: 'clear' });
            actions.append(merge, clear);
            const status = webui.create('webui-alert', { show: false });
            wrap.append(list, actions, status);
            t.replaceChildren(wrap);

            // Page counts by file, so a bad file is reported as soon as it is added.
            const counts = new WeakMap();
            let runId = 0;
            const check = async () => {
                const id = ++runId;
                status.removeAttribute('show');
                const files = list.value;
                const problems = [];
                await Promise.all(files.map(async (file, index) => {
                    if (!counts.has(file)) {
                        counts.set(file, webui.worker.pdf_page_count(file.bytes).then(n => ({ n }), error => ({ error: `${error}` })));
                    }
                    const result = await counts.get(file);
                    if (id !== runId) return;
                    if (result.error) problems.push(`${file.name}: ${result.error.replace(/^This file /, '')}`);
                    list.setNote(index, result.error ? 'Cannot be read' : plural(result.n, 'page'));
                }));
                if (id !== runId) return;
                if (problems.length) {
                    status.setValue({ text: problems.join(' ') }, 'danger');
                } else if (files.length === 1) {
                    status.setValue({ text: 'Add at least one more PDF to merge.' }, 'info');
                }
            };
            const run = async () => {
                const files = list.value;
                if (files.length < 2) {
                    status.setValue({ text: 'Add at least two PDFs to merge.' }, 'warning');
                    return;
                }
                status.setValue({ text: `Merging ${plural(files.length, 'file')}…` }, 'info');
                try {
                    const { data, lengths } = pack(files);
                    const merged = await webui.worker.merge_pdfs(data, lengths);
                    const pages = await webui.worker.pdf_page_count(merged);
                    save(merged, 'merged.pdf');
                    status.setValue({ text: `Merged ${plural(files.length, 'file')} into one PDF of ${plural(pages, 'page')} (${webui.formatBytes(merged.length)}). Your download has started.` }, 'success');
                } catch (error) {
                    status.setValue({ text: `${error}` }, 'danger');
                }
            };
            await Promise.all(['app-file-list', 'webui-button', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            list.addEventListener('change', check);
            list.addEventListener('rejected', ev => status.setValue({ text: `Skipped files that are not PDFs: ${ev.detail.join(', ')}.` }, 'warning'));
            merge.addEventListener('click', run);
            clear.addEventListener('click', () => list.clear());
        },
    });
}
