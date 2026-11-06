/*!
 * Ap Tul Diff Checker
 * Compares two texts line by line and highlights what changed.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    const toLines = text => text.split('\n').map((line, i) => ({ line, lineNumber: i + 1 }));

    webui.define('app-diff-checker', {
        preload: 'flex side-by-side input-message alert content-compare',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const inputs = webui.create('webui-side-by-side');
            const before = webui.create('webui-input-message', { label: 'Original text', placeholder: 'Paste the original text', rows: 10 });
            const after = webui.create('webui-input-message', { label: 'Changed text', placeholder: 'Paste the changed text', rows: 10 });
            inputs.append(before, after);
            const status = webui.create('webui-alert', { show: false });
            const compare = webui.create('webui-content-compare');
            compare.style.display = 'none';
            wrap.append(inputs, status, compare);
            t.replaceChildren(wrap);

            let timer = null;
            const update = () => {
                status.removeAttribute('show');
                const a = (before.value || '').replace(/\r\n/g, '\n');
                const b = (after.value || '').replace(/\r\n/g, '\n');
                if (!a && !b) {
                    compare.style.display = 'none';
                    return;
                }
                if (a === b) {
                    compare.style.display = 'none';
                    status.setValue({ text: 'The two texts are identical.' }, 'success');
                    return;
                }
                compare.style.display = '';
                // The compare view uses CSS containment and fills its parent's height, so it needs a height of its own.
                // Size it to the text, up to 70% of the screen, after which it scrolls.
                const lines = Math.max(a.split('\n').length, b.split('\n').length);
                compare.style.height = `min(70vh, ${lines * 24 + 60}px)`;
                compare.setDiff(toLines(a), toLines(b));
            };
            // Comparing long texts on every key press would be slow, so wait for a short pause in typing.
            const schedule = () => {
                clearTimeout(timer);
                timer = setTimeout(update, 200);
            };
            await Promise.all(['webui-input-message', 'webui-alert', 'webui-content-compare'].map(tag => customElements.whenDefined(tag)));
            before.addEventListener('input', schedule);
            after.addEventListener('input', schedule);
            update();
        },
    });
}
