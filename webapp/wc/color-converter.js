/*!
 * Ap Tul Color Converter
 * Converts any CSS color to HEX, RGB, HSL, and CMYK.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    let context = null;
    /**
     * Any color the browser understands (hex, rgb, hsl, hwb, named colors, oklch, and more) as
     * { r, g, b, a } with r, g, b from 0 to 255 and a from 0 to 1, or null when it is not a color.
     * The browser draws the color on a 1x1 canvas, so the result matches how it really shows on screen.
     */
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
        return { r, g, b, a: Math.round((alpha / 255) * 100) / 100 };
    }

    const hex2 = n => n.toString(16).padStart(2, '0');

    function toHsl({ r, g, b }) {
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
            h *= 60;
        }
        return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function toCmyk({ r, g, b }) {
        const k = 1 - Math.max(r, g, b) / 255;
        if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
        const part = v => Math.round(((1 - v / 255 - k) / (1 - k)) * 100);
        return { c: part(r), m: part(g), y: part(b), k: Math.round(k * 100) };
    }

    /** Each format shown for a color, in display order. */
    function formats(color) {
        const { r, g, b, a } = color;
        const { h, s, l } = toHsl(color);
        const { c, m, y, k } = toCmyk(color);
        const opaque = a >= 1;
        return [
            ['HEX', opaque ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `#${hex2(r)}${hex2(g)}${hex2(b)}${hex2(Math.round(a * 255))}`],
            ['RGB', opaque ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`],
            ['HSL', opaque ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`],
            ['CMYK (approximate, for print)', `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`],
        ];
    }

    webui.define('app-color-converter', {
        preload: 'flex input-message alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const row = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'end' });
            const input = webui.create('webui-input-message', {
                label: 'Color',
                placeholder: 'For example #ff8800, rgb(255, 136, 0), hsl(32, 100%, 50%), or orange',
                rows: 1,
                style: 'flex:1 1 24rem;',
            });
            const picker = webui.create('input', { type: 'color', value: '#ff8800', title: 'Pick a color', style: 'width:4rem; height:3rem; cursor:pointer;' });
            row.append(input, picker);
            const swatch = webui.create('div', {
                class: 'color-swatch',
                style: 'height:5rem; border-radius:var(--border-radius, 4px); border:1px solid #888; background-image:repeating-conic-gradient(#ccc 0 25%, #fff 0 50%); background-size:16px 16px;',
            });
            const fill = webui.create('div', { style: 'height:100%; border-radius:inherit;' });
            swatch.appendChild(fill);
            const status = webui.create('webui-alert', { show: false });
            const results = webui.create('div', { class: 'color-results', style: 'display:flex; flex-direction:column; gap:var(--padding);' });
            const codes = formats({ r: 0, g: 0, b: 0, a: 1 }).map(([label]) => {
                const code = webui.create('app-tool-output', { lang: 'text', label, 'data-format': label.split(' ')[0] });
                results.appendChild(code);
                return code;
            });
            wrap.append(row, swatch, status, results);
            t.replaceChildren(wrap);

            const update = () => {
                status.removeAttribute('show');
                const text = input.value || '';
                const color = parseColor(text);
                if (!color) {
                    results.style.display = 'none';
                    swatch.style.display = 'none';
                    if (text.trim()) status.setValue({ text: 'That is not a color the browser recognizes. Try a HEX value such as #ff8800.' }, 'danger');
                    return;
                }
                results.style.display = 'flex';
                swatch.style.display = '';
                const list = formats(color);
                list.forEach(([, value], i) => codes[i].setValue(value));
                // The value has been normalized to a plain rgba() string, so it is safe to set as a style.
                fill.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
                const hex = list[0][1].slice(0, 7);
                if (picker.value !== hex) picker.value = hex;
            };
            await Promise.all(['webui-input-message', 'webui-alert', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', update);
            picker.addEventListener('input', () => {
                input.setValue(picker.value);
                update();
            });
            if (!input.value) input.setValue(picker.value);
            update();
        },
    });
}
