/*!
 * Ap Tul Color Field
 * A color typed in any CSS format, with a swatch that opens the color picker.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-color-field label="Text color" value="#333333" placeholder="For example #333333 or navy"></app-color-field>
     *
     * value is the text in the box. color is that text read as { r, g, b, a } (r, g, b from 0 to 255, a from 0 to 1),
     * or null when it is not a color. The field sends an input event whenever the color is typed or picked.
     * The swatch shows the color over a checkerboard, so see-through colors look see-through, and clicking it opens
     * the browser's color picker. The picker has no transparency, so picking a color replaces any alpha.
     */
    let context = null;
    /** Any color the browser understands, drawn on a 1x1 canvas so the result matches what the screen shows. */
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
    const hex = ({ r, g, b }) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;

    webui.define('app-color-field', {
        preload: 'input-message',
        attr: ['label', 'value', 'placeholder'],
        constructor() {
            const t = this;
            t._text = '';
            t.color = null;
            t._input = t.template.querySelector('webui-input-message');
            t._picker = t.template.querySelector('input[type=color]');
            t._fill = t.template.querySelector('.fill');
            // The inner fields' own input events would reach the page before this field has read the new color.
            t._input.addEventListener('input', ev => {
                ev.stopPropagation();
                t._read(t._input.value, true);
            });
            t._picker.addEventListener('input', ev => {
                ev.stopPropagation();
                t._input.setValue(t._picker.value);
                t._read(t._picker.value, false);
            });
            t._picker.addEventListener('change', ev => ev.stopPropagation());
        },
        attrChanged(property, value) {
            const t = this;
            switch (property) {
                case 'label':
                    t._input.setAttribute('label', value || '');
                    t._picker.setAttribute('aria-label', `Pick the ${(value || 'color').toLowerCase()}`);
                    t._picker.title = t._picker.getAttribute('aria-label');
                    break;
                case 'placeholder':
                    t._input.setAttribute('placeholder', value || '');
                    break;
                case 'value':
                    t.setValue(value);
                    break;
            }
        },
        props: {
            value: {
                get() { return this._text; },
                set(v) { this.setValue(v); },
            },
        },
        async connected() {
            const t = this;
            await customElements.whenDefined('webui-input-message');
            t._ready = true;
            t._input.setValue(t._text);
            t._read(t._text, true, false);
        },
        /** Set the text, as if typed, without sending an input event. */
        setValue(value) {
            const t = this;
            const text = value === undefined || value === null ? '' : `${value}`;
            if (t._ready) t._input.setValue(text);
            t._read(text, true, false);
        },
        getValue() {
            return this._text;
        },
        /** Read text as a color, update the swatch and picker, and tell the page. */
        _read(text, syncPicker, notify = true) {
            const t = this;
            t._text = text;
            t.color = parseColor(text);
            t.toggleAttribute('invalid', !t.color && !!text.trim());
            // The color is normalized to a plain rgba() string, so it is safe to set as a style.
            t._fill.style.backgroundColor = t.color ? `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${t.color.a})` : 'transparent';
            if (syncPicker && t.color && t._picker.value !== hex(t.color)) t._picker.value = hex(t.color);
            if (notify) t.dispatchEvent(new Event('input', { bubbles: true }));
        },
        shadowTemplate: `
<label class="swatch">
<span class="fill"></span>
<input type="color" value="#000000">
</label>
<webui-input-message rows="1"></webui-input-message>
<style type="text/css">
:host {
display:flex;
align-items:stretch;
gap:var(--padding, 0.5rem);
box-sizing:border-box;
min-width:0;
}
.swatch {
position:relative;
flex:0 0 5rem;
min-height:5rem;
border-radius:var(--border-radius, 6px);
border:2px solid rgba(128, 128, 128, 0.6);
background-image:repeating-conic-gradient(#ccc 0 25%, #fff 0 50%);
background-size:16px 16px;
overflow:hidden;
cursor:pointer;
}
.swatch:focus-within {
outline:3px solid var(--color-active, #0b78ce);
outline-offset:2px;
}
:host([invalid]) .swatch {
border-style:dashed;
border-color:var(--color-danger, #b70505);
}
.fill {
position:absolute;
inset:0;
}
input[type=color] {
position:absolute;
inset:0;
width:100%;
height:100%;
opacity:0;
cursor:pointer;
border:none;
padding:0;
}
webui-input-message {
flex:1 1 auto;
min-width:0;
}
</style>
`
    });
}
