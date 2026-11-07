/*!
 * Ap Tul PDF Split
 * Takes pages out of a PDF, or splits it into several PDFs, without uploading it.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /**
     * Read page ranges such as "1-3, 5, 8-". A range without an end runs to the last page, and one without a
     * start begins at page 1. Returns [[start, end], ...] in the order written, or throws a readable message.
     */
    function parseRanges(text, total) {
        const parts = text.split(/[,;]+/).map(p => p.trim()).filter(Boolean);
        if (!parts.length) throw new Error('Enter the pages you want, such as 1-3, 5.');
        return parts.map(part => {
            const match = part.match(/^(\d*)\s*(?:-|–|to)\s*(\d*)$/i) || part.match(/^(\d+)$/);
            if (!match) throw new Error(`"${part}" is not a page or range. Use numbers like 4 or 2-6.`);
            const single = match.length === 2;
            const start = single ? parseInt(match[1]) : (match[1] ? parseInt(match[1]) : 1);
            const end = single ? start : (match[2] ? parseInt(match[2]) : total);
            if (start < 1 || end < 1) throw new Error('Pages are numbered from 1.');
            if (start > end) throw new Error(`"${part}" ends before it starts.`);
            if (end > total) throw new Error(`"${part}" goes past the last page, which is page ${total}.`);
            return [start, end];
        });
    }

    const pagesIn = ([start, end]) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    function save(bytes, filename) {
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const link = webui.create('a', { href: url, download: filename });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    webui.define('app-pdf-split', {
        preload: 'flex dropdown input-message button alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const list = webui.create('app-file-list', { accept: '.pdf,application/pdf', label: 'or drop a PDF here', button: 'Choose a PDF', single: '' });
            const options = webui.create('div', { class: 'split-options', style: 'display:none; flex-direction:column; gap:var(--padding);' });
            const mode = webui.create('webui-dropdown', {
                label: 'What to Do', value: 'extract', style: 'max-width:28rem;',
                options: 'Extract pages into one PDF|extract,Split into one PDF per range|ranges,Split every page into its own PDF|every',
            });
            const ranges = webui.create('webui-input-message', { label: 'Pages', placeholder: 'For example 1-3, 5, 8-', rows: 1 });
            const run = webui.create('webui-button', { theme: 'primary', text: 'Extract Pages', class: 'run' });
            const runRow = webui.create('div');
            runRow.appendChild(run);
            options.append(mode, ranges, runRow);
            const status = webui.create('webui-alert', { show: false });
            const results = webui.create('div', { class: 'split-results', style: 'display:none; flex-wrap:wrap; gap:var(--padding);' });
            wrap.append(list, options, status, results);
            t.replaceChildren(wrap);

            let total = 0;
            let file = null;
            const base = () => (file ? file.name : 'document.pdf').replace(/\.pdf$/i, '');

            const showMode = () => {
                const every = mode.value === 'every';
                ranges.style.display = every ? 'none' : '';
                run.innerText = { extract: 'Extract Pages', ranges: 'Split PDF', every: 'Split Every Page' }[mode.value] || 'Extract Pages';
            };
            const load = async () => {
                status.removeAttribute('show');
                results.style.display = 'none';
                results.replaceChildren();
                file = list.value[0] || null;
                total = 0;
                if (!file) {
                    options.style.display = 'none';
                    return;
                }
                try {
                    total = await webui.worker.pdf_page_count(file.bytes);
                    list.setNote(0, plural(total, 'page'));
                    options.style.display = 'flex';
                    status.setValue({ text: `${file.name} has ${plural(total, 'page')}.` }, 'info');
                } catch (error) {
                    options.style.display = 'none';
                    status.setValue({ text: `${error}`.replace(/^This PDF/, file.name) }, 'danger');
                }
            };
            const addResult = (bytes, filename, pages) => {
                const button = webui.create('webui-button', { theme: 'secondary', class: 'result', 'data-filename': filename, text: `${filename} (${plural(pages, 'page')})` });
                button.addEventListener('click', () => save(bytes, filename));
                results.appendChild(button);
            };
            const split = async () => {
                if (!file || !total) return;
                results.replaceChildren();
                results.style.display = 'none';
                let groups;
                try {
                    groups = mode.value === 'every'
                        ? pagesIn([1, total]).map(p => [p, p])
                        : parseRanges(ranges.value || '', total);
                } catch (error) {
                    status.setValue({ text: error.message }, 'warning');
                    return;
                }
                try {
                    if (mode.value === 'extract') {
                        const pages = [...new Set(groups.flatMap(pagesIn))].sort((a, b) => a - b);
                        const bytes = await webui.worker.extract_pdf_pages(file.bytes, new Uint32Array(pages));
                        const filename = `${base()}-pages.pdf`;
                        addResult(bytes, filename, pages.length);
                        save(bytes, filename);
                        status.setValue({ text: `Made a PDF of ${plural(pages.length, 'page')} (${webui.formatBytes(bytes.length)}). Your download has started.` }, 'success');
                    } else {
                        status.setValue({ text: `Making ${plural(groups.length, 'PDF')}…` }, 'info');
                        for (const group of groups) {
                            const bytes = await webui.worker.extract_pdf_pages(file.bytes, new Uint32Array(pagesIn(group)));
                            const label = group[0] === group[1] ? `page-${group[0]}` : `pages-${group[0]}-${group[1]}`;
                            addResult(bytes, `${base()}-${label}.pdf`, group[1] - group[0] + 1);
                        }
                        status.setValue({ text: `Made ${plural(groups.length, 'PDF')}. Select each one below to download it.` }, 'success');
                    }
                    results.style.display = 'flex';
                } catch (error) {
                    status.setValue({ text: `${error}` }, 'danger');
                }
            };
            await Promise.all(['app-file-list', 'webui-dropdown', 'webui-input-message', 'webui-button', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            showMode();
            list.addEventListener('change', load);
            list.addEventListener('rejected', () => status.setValue({ text: 'Choose a PDF file.' }, 'warning'));
            mode.addEventListener('change', showMode);
            run.addEventListener('click', split);
        },
    });
}
