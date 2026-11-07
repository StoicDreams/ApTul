/*!
 * Ap Tul Password Generator
 * Generates random passwords in the browser with its secure random number generator.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    const SETS = {
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lower: 'abcdefghijklmnopqrstuvwxyz',
        digits: '0123456789',
        symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
    };
    // Characters that are easy to mix up when reading or typing a password.
    const AMBIGUOUS = 'Il1O0o';

    /** A uniformly random whole number from 0 to max - 1, without the bias that % alone would add. */
    function randomIndex(max) {
        const limit = Math.floor(0x100000000 / max) * max;
        const buffer = new Uint32Array(1);
        do {
            crypto.getRandomValues(buffer);
        } while (buffer[0] >= limit);
        return buffer[0] % max;
    }

    /**
     * One password using at least one character from every chosen set.
     * Returns null when no sets are chosen.
     */
    function generate(length, chosen, avoidAmbiguous) {
        const sets = chosen.map(name => avoidAmbiguous ? [...SETS[name]].filter(c => !AMBIGUOUS.includes(c)).join('') : SETS[name]);
        if (!sets.length) return null;
        const pool = sets.join('');
        const chars = Array.from({ length }, () => pool[randomIndex(pool.length)]);
        // Put one character from each set at a random distinct position, so every set appears.
        const positions = [];
        while (positions.length < Math.min(sets.length, length)) {
            const p = randomIndex(length);
            if (!positions.includes(p)) positions.push(p);
        }
        positions.forEach((p, i) => chars[p] = sets[i][randomIndex(sets[i].length)]);
        return chars.join('');
    }

    /** Bits of randomness for a password of this length from a pool this size. */
    function strength(length, poolSize) {
        const bits = Math.round(length * Math.log2(poolSize));
        const label = bits < 50 ? 'Weak' : bits < 80 ? 'Fair' : bits < 110 ? 'Strong' : 'Very strong';
        return { bits, label };
    }

    webui.define('app-password-generator', {
        preload: 'flex input-text button alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const row = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'end' });
            const length = webui.create('webui-input-text', { label: 'Length', type: 'number', min: 4, max: 128, value: 20, style: 'width:12ch;' });
            const count = webui.create('webui-input-text', { label: 'How many', type: 'number', min: 1, max: 50, value: 1, style: 'width:12ch;' });
            const button = webui.create('webui-button', { theme: 'primary', text: 'Generate' });
            row.append(length, count, button);
            const checks = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', class: 'password-options' });
            const boxes = {};
            [['upper', 'Uppercase (A-Z)', true], ['lower', 'Lowercase (a-z)', true], ['digits', 'Numbers (0-9)', true],
                ['symbols', 'Symbols (!@#…)', true], ['ambiguous', 'Avoid look-alikes (I l 1 O 0 o)', false]].forEach(([key, text, on]) => {
                const label = webui.create('label', { style: 'display:flex; align-items:center; gap:0.5ch; cursor:pointer;' });
                const box = webui.create('input', { type: 'checkbox', name: key });
                box.checked = on;
                label.append(box, document.createTextNode(text));
                checks.appendChild(label);
                boxes[key] = box;
            });
            const status = webui.create('webui-alert', { show: false });
            const output = webui.create('app-tool-output', { label: 'Password', language: 'text' });
            wrap.append(row, checks, status, output);
            t.replaceChildren(wrap);

            const run = () => {
                const size = Math.min(128, Math.max(4, parseInt(length.value) || 20));
                const n = Math.min(50, Math.max(1, parseInt(count.value) || 1));
                const chosen = ['upper', 'lower', 'digits', 'symbols'].filter(key => boxes[key].checked);
                const avoid = boxes.ambiguous.checked;
                if (!chosen.length) {
                    output.setValue('');
                    status.setValue({ text: 'Choose at least one type of character.' }, 'warning');
                    return;
                }
                const list = Array.from({ length: n }, () => generate(size, chosen, avoid));
                const pool = chosen.map(name => avoid ? [...SETS[name]].filter(c => !AMBIGUOUS.includes(c)).length : SETS[name].length).reduce((a, b) => a + b, 0);
                const { bits, label } = strength(size, pool);
                status.setValue({ text: `${label}: about ${bits} bits of randomness.` }, bits < 50 ? 'danger' : bits < 80 ? 'warning' : 'success');
                output.setAttribute('label', n === 1 ? 'Password' : `${n} Passwords`);
                output.setValue(list.join('\n'));
            };
            await Promise.all(['app-tool-output', 'webui-input-text', 'webui-button', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            button.addEventListener('click', run);
            length.addEventListener('change', run);
            count.addEventListener('change', run);
            Object.values(boxes).forEach(box => box.addEventListener('change', run));
            run();
        },
    });
}
