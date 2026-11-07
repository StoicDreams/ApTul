/*!
 * Ap Tul Regex Tester
 * Tests JavaScript regular expressions, highlighting matches and groups, with find and replace.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    // Patterns such as (a+)+$ can take years on some text, so they run in a worker that is stopped after this long.
    const TIME_LIMIT = 1000;
    const MAX_MATCHES = 1000;

    /**
     * The matching code, run inside the worker. It must not use anything outside itself, since its source is copied
     * into the worker, and the minifier renames outside names. It can also run here if workers are blocked.
     */
    function runRegex({ pattern, flags, text, replacement, max }) {
        const regex = new RegExp(pattern, flags);
        const matches = [];
        const take = m => matches.push({
            index: m.index,
            text: m[0],
            groups: m.slice(1).map(g => g === undefined ? null : g),
            named: m.groups ? Object.fromEntries(Object.entries(m.groups).map(([k, v]) => [k, v === undefined ? null : v])) : null,
        });
        if (regex.global) {
            for (const m of text.matchAll(regex)) {
                take(m);
                if (matches.length >= max) break;
            }
        } else {
            const m = regex.exec(text);
            if (m) take(m);
        }
        const replaced = replacement === null ? null : text.replace(regex, replacement);
        return { matches, replaced, capped: matches.length >= max };
    }

    let worker = null;
    let pending = null;
    function getWorker() {
        if (!worker) {
            const source = `const run = (${runRegex.toString()});
self.onmessage = e => { try { postMessage({ ok: true, result: run(e.data) }); } catch (error) { postMessage({ ok: false, error: error.message }); } };`;
            worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
            worker.onmessage = e => {
                const done = pending;
                pending = null;
                if (!done) return;
                clearTimeout(done.timer);
                e.data.ok ? done.resolve(e.data.result) : done.reject(new Error(e.data.error));
            };
        }
        return worker;
    }

    /** Run in the worker, giving up after the time limit. A newer run replaces one still going. */
    function test(job) {
        if (pending) {
            // The old run may be stuck, so stop it rather than wait.
            clearTimeout(pending.timer);
            pending.reject(new Error('replaced'));
            pending = null;
            worker.terminate();
            worker = null;
        }
        let instance;
        try {
            instance = getWorker();
        } catch {
            return Promise.resolve().then(() => runRegex(job));
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pending = null;
                instance.terminate();
                worker = null;
                reject(new Error('timeout'));
            }, TIME_LIMIT);
            pending = { resolve, reject, timer };
            instance.postMessage(job);
        });
    }

    webui.define('app-regex-tester', {
        preload: 'flex input-message alert',
        connected() {
            this.render();
        },
        disconnected() {
            if (pending) {
                clearTimeout(pending.timer);
                pending = null;
            }
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const pattern = webui.create('webui-input-message', { label: 'Regular expression', placeholder: 'For example \\b\\w+@\\w+\\.\\w+\\b', rows: 1, value: '' });
            const flagRow = webui.create('div', { class: 'regex-flags', style: 'display:flex; flex-wrap:wrap; gap:calc(2 * var(--padding));' });
            const flags = {};
            [['g', 'Global (find all)', true], ['i', 'Ignore case', false], ['m', 'Multiline (^ and $ match each line)', false],
                ['s', 'Dot matches new lines', false], ['u', 'Unicode', false]].forEach(([flag, text, on]) => {
                const label = webui.create('label', { style: 'display:flex; align-items:center; gap:0.5ch; cursor:pointer;' });
                const box = webui.create('input', { type: 'checkbox', name: flag });
                box.checked = on;
                label.append(box, document.createTextNode(`${text} `), webui.create('code', { text: flag }));
                flagRow.appendChild(label);
                flags[flag] = box;
            });
            const text = webui.create('webui-input-message', { label: 'Test text', placeholder: 'Paste the text to search', rows: 8 });
            const status = webui.create('webui-alert', { show: false });
            const highlight = webui.create('pre', {
                class: 'regex-highlight',
                style: 'display:none; white-space:pre-wrap; overflow-wrap:anywhere; margin:0; padding:var(--padding); border:1px solid #888; border-radius:var(--border-radius, 4px); max-height:24rem; overflow:auto;',
            });
            const table = webui.create('table', { class: 'regex-matches', style: 'display:none; width:100%; border-collapse:collapse;' });
            const replace = webui.create('webui-input-message', { label: 'Replace with (optional)', placeholder: 'Use $1 or $<name> for groups, and $& for the whole match', rows: 1 });
            const output = webui.create('app-tool-output', { label: 'Result after replacing', language: 'text' });
            wrap.append(pattern, flagRow, text, status, highlight, table, replace, output);
            t.replaceChildren(wrap);

            const show = (matches, source) => {
                // Built from text nodes, so the test text is never read as HTML.
                const fragment = document.createDocumentFragment();
                let last = 0;
                for (const m of matches) {
                    if (!m.text.length || m.index < last) continue;
                    fragment.appendChild(document.createTextNode(source.slice(last, m.index)));
                    fragment.appendChild(webui.create('mark', { text: m.text }));
                    last = m.index + m.text.length;
                }
                fragment.appendChild(document.createTextNode(source.slice(last)));
                highlight.replaceChildren(fragment);
                highlight.style.display = matches.length ? '' : 'none';

                const groupCount = Math.max(0, ...matches.map(m => m.groups.length));
                const names = [...new Set(matches.flatMap(m => m.named ? Object.keys(m.named) : []))];
                const head = webui.create('tr');
                ['#', 'Position', 'Match', ...Array.from({ length: groupCount }, (_, i) => `Group ${i + 1}`), ...names.map(n => `<${n}>`)]
                    .forEach(h => head.appendChild(webui.create('th', { text: h, style: 'text-align:left; border-bottom:1px solid #888; padding:0.25em 0.5em;' })));
                const body = document.createDocumentFragment();
                body.appendChild(head);
                matches.slice(0, 200).forEach((m, i) => {
                    const row = webui.create('tr');
                    const cells = [`${i + 1}`, `${m.index}`, m.text, ...Array.from({ length: groupCount }, (_, g) => m.groups[g]), ...names.map(n => m.named ? m.named[n] : null)];
                    cells.forEach(value => row.appendChild(webui.create('td', {
                        text: value === null || value === undefined ? '(no match)' : value,
                        style: `padding:0.25em 0.5em; border-bottom:1px solid #8884; font-family:monospace; white-space:pre-wrap;${value === null ? ' opacity:0.6;' : ''}`,
                    })));
                    body.appendChild(row);
                });
                table.replaceChildren(body);
                table.style.display = matches.length ? '' : 'none';
            };

            let runId = 0;
            let timer = null;
            const update = async () => {
                const id = ++runId;
                const source = (text.value || '').replace(/\r\n/g, '\n');
                const expression = pattern.value || '';
                const replacement = replace.value ? replace.value : null;
                if (!expression) {
                    status.removeAttribute('show');
                    show([], source);
                    output.setValue('');
                    return;
                }
                const flagText = Object.entries(flags).filter(([, box]) => box.checked).map(([flag]) => flag).join('');
                try {
                    // Check the pattern here first, so a typo is reported straight away.
                    new RegExp(expression, flagText);
                } catch (error) {
                    status.setValue({ text: `That pattern is not valid: ${error.message.replace(/^Invalid regular expression: /, '')}` }, 'danger');
                    show([], source);
                    output.setValue('');
                    return;
                }
                try {
                    const result = await test({ pattern: expression, flags: flagText, text: source, replacement, max: MAX_MATCHES });
                    if (id !== runId) return;
                    show(result.matches, source);
                    output.setValue(result.replaced === null ? '' : result.replaced);
                    const count = result.matches.length;
                    const shown = count > 200 ? ' The table shows the first 200.' : '';
                    if (!count) {
                        status.setValue({ text: 'No matches.' }, 'warning');
                    } else {
                        status.setValue({ text: `${result.capped ? `More than ${MAX_MATCHES}` : count} ${count === 1 ? 'match' : 'matches'}.${shown}` }, 'success');
                    }
                } catch (error) {
                    if (id !== runId || error.message === 'replaced') return;
                    show([], source);
                    output.setValue('');
                    status.setValue({
                        text: error.message === 'timeout'
                            ? 'This pattern took longer than a second, so it was stopped. Nested repeats such as (a+)+ can take an extremely long time on text that almost matches.'
                            : error.message,
                    }, 'danger');
                }
            };
            const schedule = () => {
                clearTimeout(timer);
                timer = setTimeout(update, 150);
            };
            await Promise.all(['webui-input-message', 'webui-alert', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            [pattern, text, replace].forEach(el => el.addEventListener('input', schedule));
            Object.values(flags).forEach(box => box.addEventListener('change', update));
            if (!pattern.value && !text.value) {
                pattern.setValue('(?<user>[\\w.+-]+)@(?<domain>[\\w-]+\\.[\\w.]+)');
                text.setValue('Contact ana@example.com or support@aptul.com for help.');
            }
            update();
        },
    });
}
