/*!
 * Ap Tul Contrast Checker
 * Checks the contrast between text and background colors against the WCAG 2 accessibility levels.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    let context = null;
    /** Any CSS color as { r, g, b, a }, drawn on a 1x1 canvas, or null when it is not a color. */
    function parseColor(text) {
        const value = (text || '').trim();
        if (!value || !CSS.supports('color', value)) return null;
        if (!context) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            context = canvas.getContext('2d', { willReadFrequently: true });
        }
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: alpha / 255 };
    }

    /** A see-through color as it appears over another, opaque color. */
    function blend(top, bottom) {
        const mix = (t, b) => Math.round(t * top.a + b * (1 - top.a));
        return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
    }

    /** Relative luminance, as WCAG 2 defines it. */
    function luminance({ r, g, b }) {
        const channel = v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }

    function contrastRatio(a, b) {
        const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (light + 0.05) / (dark + 0.05);
    }

    const LEVELS = [
        ['AA, normal text', 4.5],
        ['AA, large text (24px, or 19px bold)', 3],
        ['AAA, normal text', 7],
        ['AAA, large text', 4.5],
        ['Buttons, icons, and other graphics', 3],
    ];

    webui.define('app-contrast-checker', {
        preload: 'flex input-message alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const row = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'end' });
            const colorField = (label, value) => {
                const box = webui.create('webui-flex', { gap: '0.5rem', align: 'end', style: 'flex:1 1 18rem;' });
                const input = webui.create('webui-input-message', { label, rows: 1, style: 'flex:1;' });
                const picker = webui.create('input', { type: 'color', value, title: `Pick the ${label.toLowerCase()}`, style: 'width:3.5rem; height:3rem; cursor:pointer;' });
                box.append(input, picker);
                row.appendChild(box);
                return { input, picker, value };
            };
            const fg = colorField('Text color', '#333333');
            const bg = colorField('Background color', '#ffffff');
            const preview = webui.create('div', { class: 'contrast-preview', style: 'padding:var(--padding); border-radius:var(--border-radius, 4px); border:1px solid #888;' });
            preview.append(
                webui.create('p', { text: 'Normal text: the quick brown fox jumps over the lazy dog.', style: 'margin:0 0 0.5em 0; font-size:16px;' }),
                webui.create('p', { text: 'Large text: the quick brown fox.', style: 'margin:0; font-size:24px;' }),
            );
            const ratioBox = webui.create('div', { class: 'contrast-ratio', style: 'font-size:2.5em; font-weight:bold; text-align:center;' });
            const status = webui.create('webui-alert', { show: false });
            const table = webui.create('div', { class: 'contrast-levels', style: 'display:grid; grid-template-columns:1fr auto auto; gap:0.25rem 1rem; align-items:center;' });
            wrap.append(row, preview, ratioBox, status, table);
            t.replaceChildren(wrap);

            const update = () => {
                status.removeAttribute('show');
                const text = parseColor(fg.input.value);
                const back = parseColor(bg.input.value);
                if (!text || !back) {
                    ratioBox.innerText = '';
                    table.replaceChildren();
                    status.setValue({ text: `The ${!text ? 'text' : 'background'} color is not a color the browser recognizes.` }, 'danger');
                    return;
                }
                // See-through backgrounds are shown over white, and see-through text over the background.
                const solidBack = back.a < 1 ? blend(back, { r: 255, g: 255, b: 255 }) : back;
                const solidText = text.a < 1 ? blend(text, solidBack) : text;
                const ratio = contrastRatio(solidText, solidBack);
                // WCAG says never round up, so 4.499 must not show as 4.5.
                ratioBox.innerText = `${(Math.floor(ratio * 100) / 100).toFixed(2)} : 1`;
                preview.style.color = `rgb(${solidText.r}, ${solidText.g}, ${solidText.b})`;
                preview.style.backgroundColor = `rgb(${solidBack.r}, ${solidBack.g}, ${solidBack.b})`;
                const rows = document.createDocumentFragment();
                LEVELS.forEach(([name, needed]) => {
                    const pass = ratio >= needed;
                    rows.append(
                        webui.create('span', { text: name }),
                        webui.create('span', { text: `${needed} : 1` }),
                        webui.create('strong', { text: pass ? 'Pass' : 'Fail', 'data-level': name, style: `color:${pass ? '#2e9e2e' : '#d33'};` }),
                    );
                });
                table.replaceChildren(rows);
                if (text.a < 1 || back.a < 1) {
                    status.setValue({ text: 'One of the colors is see-through. It is checked as it would look over the background (or over white for the background itself).' }, 'info');
                }
            };
            await Promise.all(['webui-input-message', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            [fg, bg].forEach(field => {
                if (!field.input.value) field.input.setValue(field.value);
                field.input.addEventListener('input', () => {
                    const color = parseColor(field.input.value);
                    if (color && color.a >= 1) {
                        field.picker.value = `#${[color.r, color.g, color.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
                    }
                    update();
                });
                field.picker.addEventListener('input', () => {
                    field.input.setValue(field.picker.value);
                    update();
                });
            });
            update();
        },
    });
}
