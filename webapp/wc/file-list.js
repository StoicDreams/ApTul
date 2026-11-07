/*!
 * Ap Tul File List
 * Choose or drop files, then put them in order. Used by tools that combine several files.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-file-list accept=".pdf,application/pdf" label="Drop PDFs here" button="Choose PDFs"></app-file-list>
     * <app-file-list accept=".pdf" single></app-file-list>
     *
     * value: [{ name, type, size, bytes }] in the chosen order, where bytes is a Uint8Array.
     * Fires change whenever files are added, moved, or removed. setNote(index, text) shows a note beside a file,
     * such as its page count. With single, a new file replaces the current one.
     */

    /** File inputs give data URLs, and drops give ArrayBuffers. Tools need bytes either way. */
    async function toBytes(content) {
        if (content instanceof ArrayBuffer) return new Uint8Array(content);
        return new Uint8Array(await (await fetch(content)).arrayBuffer());
    }

    function matchesAccept(file, accept) {
        if (!accept) return true;
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        return accept.split(',').map(a => a.trim().toLowerCase()).filter(Boolean).some(rule => {
            if (rule.startsWith('.')) return name.endsWith(rule);
            if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
            return type === rule;
        });
    }

    webui.define('app-file-list', {
        preload: 'file-select button',
        attr: ['accept', 'label', 'button'],
        constructor() {
            const t = this;
            t.value = [];
            t._notes = [];
        },
        connected() {
            const t = this;
            const accept = t.accept || '';
            // A multiple attribute of any value allows several files, so only add it when wanted.
            const multiple = t.hasAttribute('single') ? {} : { multiple: '' };
            // The drop zone takes every file, and this list checks them, so it can name the files it skips.
            t._drop = webui.create('app-file-drop', { read: 'buffer', label: t.label || 'Drop files here', ...multiple });
            const pick = webui.create('div', {
                style: 'display:flex; flex-direction:column; align-items:center; gap:var(--padding); padding:calc(2 * var(--padding)); border:2px dashed #888; border-radius:var(--border-radius, 4px);',
            });
            t._select = webui.create('webui-file-select', { label: t.button || 'Choose Files', accept, ...multiple });
            pick.append(t._select, webui.create('p', { text: t.label || 'or drop files here', style: 'margin:0;' }));
            t._drop.appendChild(pick);
            t._list = webui.create('ol', { class: 'file-list', style: 'display:none; margin:0; padding-left:2em;' });
            t.replaceChildren(t._drop, t._list);
            // The inner change events would reach the tool before the files are added, so this list sends its own.
            t._drop.addEventListener('change', ev => { ev.stopPropagation(); t.add(t._drop.value); });
            t._select.addEventListener('change', ev => { ev.stopPropagation(); t.add(t._select.value); });
        },
        /** Add files read by app-file-drop or webui-file-select. Files of other types are skipped and reported. */
        async add(files) {
            const t = this;
            const all = files || [];
            const ok = all.filter(file => matchesAccept(file, t.accept));
            const read = await Promise.all(ok.map(async file => ({
                name: file.name, type: file.type, size: file.size, bytes: await toBytes(file.content),
            })));
            if (!read.length) {
                if (all.length) t.dispatchEvent(new CustomEvent('rejected', { detail: all.map(f => f.name) }));
                return;
            }
            if (t.hasAttribute('single')) {
                t.value = read.slice(0, 1);
                t._notes = [];
            } else {
                t.value = t.value.concat(read);
            }
            t.changed();
            // After change, so tools that reset their messages on change still show this one.
            if (ok.length < all.length) {
                t.dispatchEvent(new CustomEvent('rejected', { detail: all.filter(f => !ok.includes(f)).map(f => f.name) }));
            }
        },
        move(index, by) {
            const t = this;
            const to = index + by;
            if (to < 0 || to >= t.value.length) return;
            [t.value[index], t.value[to]] = [t.value[to], t.value[index]];
            [t._notes[index], t._notes[to]] = [t._notes[to], t._notes[index]];
            t.changed();
        },
        remove(index) {
            const t = this;
            t.value.splice(index, 1);
            t._notes.splice(index, 1);
            t.changed();
        },
        clear() {
            const t = this;
            t.value = [];
            t._notes = [];
            t.changed();
        },
        setNote(index, text) {
            const t = this;
            t._notes[index] = text;
            const note = t._list.children[index]?.querySelector('.file-note');
            if (note) note.innerText = text || '';
        },
        getValue() {
            return this.value;
        },
        changed() {
            const t = this;
            t.render();
            t.dispatchEvent(new Event('change'));
        },
        /** Build the list off the page, then put it in at once. */
        render() {
            const t = this;
            const rows = document.createDocumentFragment();
            t.value.forEach((file, index) => {
                const row = webui.create('li', { class: 'file-row', style: 'margin:0.25em 0;' });
                const line = webui.create('div', { style: 'display:flex; flex-wrap:wrap; align-items:center; gap:1ch;' });
                const name = webui.create('span', { class: 'file-name', text: file.name, style: 'font-weight:bold; overflow-wrap:anywhere;' });
                const detail = webui.create('span', { class: 'file-note', text: t._notes[index] || '', style: 'opacity:0.8;' });
                const size = webui.create('span', { text: webui.formatBytes(file.size), style: 'opacity:0.8;' });
                const buttons = webui.create('span', { style: 'display:inline-flex; gap:0.5ch; margin-left:auto;' });
                const button = (text, title, cls, onClick, disabled) => {
                    const b = webui.create('button', { type: 'button', class: cls, title, 'aria-label': `${title}: ${file.name}`, text });
                    b.disabled = !!disabled;
                    b.addEventListener('click', onClick);
                    buttons.appendChild(b);
                };
                if (!t.hasAttribute('single')) {
                    button('↑', 'Move up', 'move-up', () => t.move(index, -1), index === 0);
                    button('↓', 'Move down', 'move-down', () => t.move(index, 1), index === t.value.length - 1);
                }
                button('✕', 'Remove', 'remove', () => t.remove(index));
                line.append(name, size, detail, buttons);
                row.appendChild(line);
                rows.appendChild(row);
            });
            t._list.replaceChildren(rows);
            t._list.style.display = t.value.length ? '' : 'none';
        },
    });
}
