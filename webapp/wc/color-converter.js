/*!
 * Ap Tul Color Converter
 * Converts any CSS color to HEX, RGB, HSL, and CMYK.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
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

    /** Each format shown for a color, in display order. a is rounded to two places. */
    function formats(color) {
        const { r, g, b } = color;
        const a = Math.round(color.a * 100) / 100;
        const { h, s, l } = toHsl(color);
        const { c, m, y, k } = toCmyk(color);
        const opaque = a >= 1;
        return [
            ['HEX', opaque ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `#${hex2(r)}${hex2(g)}${hex2(b)}${hex2(Math.round(a * 255))}`],
            ['RGB', opaque ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`],
            ['HSL', opaque ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`],
            ['CMYK', `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`],
        ];
    }

    /** Black or white, whichever reads better on the color (blended over white when see-through). */
    function readableOn({ r, g, b, a }) {
        const mix = v => v * a + 255 * (1 - a);
        const brightness = (mix(r) * 299 + mix(g) * 587 + mix(b) * 114) / 1000;
        return brightness > 150 ? '#000000' : '#ffffff';
    }

    webui.define('app-color-converter', {
        preload: 'alert',
        constructor() {
            const t = this;
            t._field = t.template.querySelector('app-color-field');
            t._status = t.template.querySelector('webui-alert');
            t._card = t.template.querySelector('.card');
            t._fill = t.template.querySelector('.fill');
            t._name = t.template.querySelector('.name');
            t._outputs = [...t.template.querySelectorAll('app-tool-output')];
        },
        async connected() {
            const t = this;
            await Promise.all(['app-color-field', 'app-tool-output', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            t._field.addEventListener('input', () => t.update());
            t.update();
        },
        update() {
            const t = this;
            const color = t._field.color;
            t._status.removeAttribute('show');
            t._card.hidden = !color;
            if (!color) {
                if ((t._field.value || '').trim()) t._status.setValue({ text: 'That is not a color the browser recognizes. Try a HEX value such as #ff8800.' }, 'danger');
                return;
            }
            const list = formats(color);
            list.forEach(([, value], i) => t._outputs[i].setValue(value));
            // The color is normalized to a plain rgba() string, so it is safe to set as a style.
            t._fill.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
            t._fill.style.color = readableOn(color);
            t._name.textContent = list[0][1];
        },
        shadowTemplate: `
<app-color-field label="Color" value="#ff8800" placeholder="For example #ff8800, rgb(255, 136, 0), hsl(32, 100%, 50%), or orange"></app-color-field>
<webui-alert></webui-alert>
<div class="card">
<div class="preview" aria-hidden="true"><div class="fill"><span class="name"></span></div></div>
<div class="color-results">
<app-tool-output inline label="HEX" data-format="HEX"></app-tool-output>
<app-tool-output inline label="RGB" data-format="RGB"></app-tool-output>
<app-tool-output inline label="HSL" data-format="HSL"></app-tool-output>
<app-tool-output inline label="CMYK" data-format="CMYK"></app-tool-output>
<p class="note">CMYK is an approximation for print. Printers convert colors with their own profiles.</p>
</div>
</div>
<style type="text/css">
:host {
display:flex;
flex-direction:column;
gap:var(--padding, 0.5rem);
max-width:60rem;
margin-inline:auto;
box-sizing:border-box;
}
.card {
display:grid;
grid-template-columns:minmax(10rem, 16rem) minmax(0, 1fr);
gap:calc(var(--padding, 0.5rem) * 2);
padding:calc(var(--padding, 0.5rem) * 2);
border-radius:var(--border-radius, 6px);
background-color:rgba(0, 0, 0, 0.2);
--tool-output-label-width:4rem;
}
.card[hidden] { display:none; }
.preview {
position:relative;
aspect-ratio:1;
border-radius:var(--border-radius, 6px);
border:2px solid rgba(128, 128, 128, 0.6);
background-image:repeating-conic-gradient(#ccc 0 25%, #fff 0 50%);
background-size:20px 20px;
overflow:hidden;
}
.fill {
position:absolute;
inset:0;
display:flex;
align-items:flex-end;
justify-content:center;
padding:0.75rem;
font-family:ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
font-size:1.2rem;
font-weight:bold;
}
.color-results {
display:flex;
flex-direction:column;
justify-content:center;
gap:var(--padding, 0.5rem);
min-width:0;
}
.note {
margin:0;
font-size:0.875em;
opacity:0.85;
}
@media (max-width: 640px) {
.card { grid-template-columns:minmax(0, 1fr); }
.preview { aspect-ratio:auto; height:8rem; }
}
</style>
`
    });
}
