/*!
 * Ap Tul Word Counter
 * Counts words, characters, sentences, and paragraphs, and estimates reading time.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    // Average adult reading and speaking speeds, in words per minute.
    const READING_WPM = 238;
    const SPEAKING_WPM = 150;
    const hasSegmenter = typeof Intl.Segmenter === 'function';

    function countSegments(text, granularity, filter) {
        if (!hasSegmenter) return null;
        let n = 0;
        for (const segment of new Intl.Segmenter(undefined, { granularity }).segment(text)) {
            if (filter(segment)) n++;
        }
        return n;
    }

    function minutes(words, wpm) {
        if (!words) return '0 min';
        const total = Math.round((words / wpm) * 60);
        if (total < 60) return `${total} sec`;
        const m = Math.floor(total / 60);
        const s = total % 60;
        return s ? `${m} min ${s} sec` : `${m} min`;
    }

    /**
     * Counts for a piece of text. Words, sentences, and characters use the browser's language-aware
     * segmenter, so emoji count as one character and languages without spaces still count words.
     */
    function analyze(text) {
        const words = countSegments(text, 'word', s => s.isWordLike) ?? (text.match(/\S+/g) || []).length;
        const characters = countSegments(text, 'grapheme', () => true) ?? [...text].length;
        const noSpaces = countSegments(text.replace(/\s+/g, ''), 'grapheme', () => true) ?? [...text.replace(/\s+/g, '')].length;
        const sentences = countSegments(text, 'sentence', s => /[\p{L}\p{N}]/u.test(s.segment)) ?? (text.match(/[^.!?]+[.!?]+/g) || []).length;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
        return {
            Words: words,
            Characters: characters,
            'Characters without spaces': noSpaces,
            Sentences: sentences,
            Paragraphs: paragraphs,
            'Reading time': minutes(words, READING_WPM),
            'Speaking time': minutes(words, SPEAKING_WPM),
        };
    }

    webui.define('app-word-counter', {
        preload: 'flex input-message',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const input = webui.create('webui-input-message', { label: 'Text', placeholder: 'Type or paste your text', rows: 10 });
            const stats = webui.create('div', {
                class: 'word-stats',
                style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(11rem, 1fr)); gap:var(--padding);',
            });
            const values = {};
            Object.keys(analyze('')).forEach(name => {
                const tile = webui.create('div', {
                    'data-stat': name,
                    style: 'padding:var(--padding); border-radius:var(--border-radius, 4px); background-color:var(--color-background-offset, #eee); color:var(--color-background, #333); text-align:center;',
                });
                values[name] = webui.create('div', { text: '0', style: 'font-size:2em; font-weight:bold;' });
                tile.append(values[name], webui.create('div', { text: name }));
                stats.appendChild(tile);
            });
            wrap.append(stats, input);
            t.replaceChildren(wrap);

            const update = () => {
                const result = analyze(input.value || '');
                Object.entries(result).forEach(([name, value]) => {
                    const text = typeof value === 'number' ? value.toLocaleString() : value;
                    if (values[name].innerText !== text) values[name].innerText = text;
                });
            };
            await customElements.whenDefined('webui-input-message');
            input.addEventListener('input', update);
            update();
        },
    });
}
