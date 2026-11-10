/*!
 * Ap Tul Contrast Checker
 * Checks the contrast between text and background colors against the WCAG 2 accessibility levels.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
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

    // [data-level name, level, what it covers, detail, ratio needed]
    const LEVELS = [
        ['AA, normal text', 'AA', 'Normal text', '', 4.5],
        ['AA, large text (24px, or 19px bold)', 'AA', 'Large text', '24px, or 19px bold', 3],
        ['AAA, normal text', 'AAA', 'Normal text', '', 7],
        ['AAA, large text', 'AAA', 'Large text', '24px, or 19px bold', 4.5],
        ['Buttons, icons, and other graphics', 'AA', 'Graphics', 'Buttons, icons, and borders', 3],
    ];

    /** One sentence for the result as a whole. */
    function verdict(ratio) {
        if (ratio >= 7) return 'Passes AAA for all text';
        if (ratio >= 4.5) return 'Passes AA for all text';
        if (ratio >= 3) return 'Passes AA for large text and graphics only';
        return 'Fails every level';
    }

    webui.define('app-contrast-checker', {
        preload: 'alert',
        constructor() {
            const t = this;
            [t._fg, t._bg] = t.template.querySelectorAll('app-color-field');
            t._status = t.template.querySelector('webui-alert');
            t._result = t.template.querySelector('.result');
            t._preview = t.template.querySelector('.contrast-preview');
            t._ratio = t.template.querySelector('.contrast-ratio');
            t._verdict = t.template.querySelector('.verdict');
            t._levels = t.template.querySelector('.contrast-levels');
            t.template.querySelector('button.swap').addEventListener('click', () => t.swap());
        },
        async connected() {
            const t = this;
            await Promise.all(['app-color-field', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            t._fg.addEventListener('input', () => t.update());
            t._bg.addEventListener('input', () => t.update());
            t.update();
        },
        /** Swap the text and background colors. */
        swap() {
            const t = this;
            const text = t._fg.value;
            t._fg.setValue(t._bg.value);
            t._bg.setValue(text);
            t.update();
        },
        update() {
            const t = this;
            t._status.removeAttribute('show');
            const text = t._fg.color;
            const back = t._bg.color;
            if (!text || !back) {
                t._result.hidden = true;
                t._levels.replaceChildren();
                t._status.setValue({ text: `The ${!text ? 'text' : 'background'} color is not a color the browser recognizes.` }, 'danger');
                return;
            }
            t._result.hidden = false;
            // See-through backgrounds are shown over white, and see-through text over the background.
            const solidBack = back.a < 1 ? blend(back, { r: 255, g: 255, b: 255 }) : back;
            const solidText = text.a < 1 ? blend(text, solidBack) : text;
            const ratio = contrastRatio(solidText, solidBack);
            // WCAG says never round up, so 4.499 must not show as 4.5.
            t._ratio.innerText = `${(Math.floor(ratio * 100) / 100).toFixed(2)} : 1`;
            t._verdict.innerText = verdict(ratio);
            t._result.dataset.grade = ratio >= 4.5 ? 'pass' : ratio >= 3 ? 'partial' : 'fail';
            t._preview.style.color = `rgb(${solidText.r}, ${solidText.g}, ${solidText.b})`;
            t._preview.style.backgroundColor = `rgb(${solidBack.r}, ${solidBack.g}, ${solidBack.b})`;
            const tiles = document.createDocumentFragment();
            LEVELS.forEach(([name, level, covers, detail, needed]) => {
                const pass = ratio >= needed;
                const tile = webui.create('div', { class: `tile ${pass ? 'pass' : 'fail'}` });
                tile.append(
                    webui.create('strong', { class: 'badge', text: pass ? 'Pass' : 'Fail', 'data-level': name }),
                    webui.create('span', { class: 'level', text: `${level} · ${covers}` }),
                );
                if (detail) tile.append(webui.create('span', { class: 'detail', text: detail }));
                tile.append(webui.create('span', { class: 'needs', text: `Needs ${needed} : 1` }));
                tiles.append(tile);
            });
            t._levels.replaceChildren(tiles);
            if (text.a < 1 || back.a < 1) {
                t._status.setValue({ text: 'One of the colors is see-through. It is checked as it would look over the background (or over white for the background itself).' }, 'info');
            }
        },
        shadowTemplate: `
<div class="fields">
<app-color-field label="Text color" value="#333333"></app-color-field>
<button type="button" class="swap" title="Swap the text and background colors" aria-label="Swap the text and background colors">⇄</button>
<app-color-field label="Background color" value="#ffffff"></app-color-field>
</div>
<webui-alert></webui-alert>
<div class="result">
<div class="contrast-preview">
<p class="large">Large text: the quick brown fox.</p>
<p class="normal">Normal text: the quick brown fox jumps over the lazy dog.</p>
<span class="sample-button">Button</span>
</div>
<div class="score">
<div class="contrast-ratio" aria-live="polite"></div>
<div class="verdict"></div>
</div>
</div>
<div class="contrast-levels"></div>
<style type="text/css">
:host {
display:flex;
flex-direction:column;
gap:var(--padding, 0.5rem);
max-width:60rem;
margin-inline:auto;
box-sizing:border-box;
}
.fields {
display:grid;
grid-template-columns:minmax(0, 1fr) auto minmax(0, 1fr);
align-items:center;
gap:var(--padding, 0.5rem);
}
.swap {
width:2.75rem;
height:2.75rem;
border-radius:50%;
border:none;
background-color:var(--color-button, #0b78ce);
color:var(--color-button-offset, #fff);
font-size:1.4rem;
line-height:1;
cursor:pointer;
}
.swap:hover { filter:brightness(1.15); }
.swap:focus-visible {
outline:3px solid var(--color-active, #0b78ce);
outline-offset:3px;
}
.result {
display:grid;
grid-template-columns:minmax(0, 1fr) minmax(11rem, 15rem);
border-radius:var(--border-radius, 6px);
overflow:hidden;
border:2px solid rgba(128, 128, 128, 0.6);
}
.result[hidden] { display:none; }
.contrast-preview {
padding:calc(var(--padding, 0.5rem) * 2);
display:flex;
flex-direction:column;
align-items:flex-start;
gap:0.75rem;
}
.contrast-preview p { margin:0; }
.large { font-size:24px; }
.normal { font-size:16px; }
.sample-button {
padding:0.35em 1em;
border:2px solid currentColor;
border-radius:var(--border-radius, 6px);
font-size:16px;
font-weight:bold;
}
.score {
display:flex;
flex-direction:column;
justify-content:center;
align-items:center;
text-align:center;
gap:0.5rem;
padding:calc(var(--padding, 0.5rem) * 2);
background-color:rgba(0, 0, 0, 0.25);
}
.contrast-ratio {
font-size:2.75rem;
font-weight:bold;
line-height:1;
white-space:nowrap;
}
.verdict {
font-weight:bold;
padding:0.25em 0.75em;
border-radius:1em;
background-color:var(--color-danger);
color:var(--color-danger-offset);
}
.result[data-grade=partial] .verdict {
background-color:var(--color-warning);
color:var(--color-warning-offset);
}
.result[data-grade=pass] .verdict {
background-color:var(--color-success);
color:var(--color-success-offset);
}
.contrast-levels {
display:grid;
grid-template-columns:repeat(auto-fit, minmax(10.5rem, 1fr));
gap:var(--padding, 0.5rem);
}
.tile {
display:flex;
flex-direction:column;
align-items:flex-start;
gap:0.25rem;
padding:var(--padding, 0.5rem) calc(var(--padding, 0.5rem) * 1.5);
border-radius:var(--border-radius, 6px);
background-color:rgba(0, 0, 0, 0.2);
border-left:5px solid var(--color-danger);
}
.tile.pass { border-left-color:var(--color-success); }
/* Badges in the theme's own colors, which are chosen to be readable, whatever the page background. */
.badge {
padding:0 0.5em;
border-radius:4px;
background-color:var(--color-danger);
color:var(--color-danger-offset);
}
.tile.pass .badge {
background-color:var(--color-success);
color:var(--color-success-offset);
}
.level { font-weight:bold; }
.detail, .needs { font-size:0.875em; opacity:0.85; }
@media (max-width: 720px) {
.fields { grid-template-columns:minmax(0, 1fr); justify-items:center; }
.fields app-color-field { width:100%; }
.swap { transform:rotate(90deg); }
.result { grid-template-columns:minmax(0, 1fr); }
}
</style>
`
    });
}
