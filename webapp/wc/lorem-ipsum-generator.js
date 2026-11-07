/*!
 * Ap Tul Lorem Ipsum Generator
 * Makes placeholder text as paragraphs, sentences, words, or a list, in plain text or HTML.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    const OPENING = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';
    const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore '
        + 'magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat '
        + 'duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat '
        + 'cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt '
        + 'lacus nunc mauris viverra feugiat nibh quisque ornare porta augue vestibulum ante primis faucibus orci luctus '
        + 'ultrices posuere cubilia integer nec odio praesent libero sagittis mattis tellus suspendisse potenti').split(' ');
    const LIMITS = { paragraphs: 50, sentences: 200, words: 2000, list: 100 };

    const pick = random => WORDS[Math.floor(random() * WORDS.length)];
    const between = (random, low, high) => low + Math.floor(random() * (high - low + 1));
    const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

    function words(random, count) {
        return Array.from({ length: count }, () => pick(random));
    }

    /** A sentence of 6 to 16 words, sometimes with a comma, like real writing. */
    function sentence(random) {
        const list = words(random, between(random, 6, 16));
        if (list.length > 9 && random() < 0.5) list[between(random, 3, list.length - 4)] += ',';
        return `${capitalize(list.join(' '))}.`;
    }

    function paragraph(random) {
        return Array.from({ length: between(random, 4, 7) }, () => sentence(random)).join(' ');
    }

    /** Start the first piece with the familiar opening, so it reads as placeholder text at a glance. */
    function withOpening(text, kind) {
        if (kind === 'words') {
            const rest = text.split(' ');
            const open = OPENING.replace(',', '').toLowerCase().split(' ');
            return capitalize(open.concat(rest).slice(0, rest.length).join(' '));
        }
        const firstEnd = text.indexOf('.');
        // Replace the first sentence with the opening, keeping the rest.
        return `${OPENING}${text.slice(firstEnd)}`;
    }

    function generate(kind, count, opening, random = Math.random) {
        let items;
        switch (kind) {
            case 'sentences':
                items = [Array.from({ length: count }, () => sentence(random)).join(' ')];
                break;
            case 'words':
                items = [capitalize(words(random, count).join(' '))];
                break;
            case 'list':
                items = Array.from({ length: count }, () => capitalize(words(random, between(random, 2, 6)).join(' ')));
                break;
            default:
                items = Array.from({ length: count }, () => paragraph(random));
        }
        if (opening && items.length) items[0] = withOpening(items[0], kind === 'list' ? 'words' : kind);
        return items;
    }

    function format(items, kind, html) {
        if (!html) return kind === 'list' ? items.map(i => `- ${i}`).join('\n') : items.join('\n\n');
        if (kind === 'list') return `<ul>\n${items.map(i => `    <li>${i}</li>`).join('\n')}\n</ul>`;
        return items.map(i => `<p>${i}</p>`).join('\n');
    }

    webui.define('app-lorem-ipsum-generator', {
        preload: 'flex dropdown input-text button',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const row = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:var(--padding); align-items:end;' });
            const count = webui.create('webui-input-text', { label: 'How many', type: 'number', min: 1, max: 50, value: 3, style: 'width:12ch;' });
            const kind = webui.create('webui-dropdown', {
                label: 'Of', value: 'paragraphs', style: 'flex:1 1 12rem; max-width:18rem;',
                options: 'Paragraphs|paragraphs,Sentences|sentences,Words|words,List items|list',
            });
            const button = webui.create('webui-button', { theme: 'primary', text: 'Generate' });
            row.append(count, kind, button);
            const options = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:calc(2 * var(--padding));' });
            const box = (name, text, on) => {
                const label = webui.create('label', { style: 'display:flex; align-items:center; gap:0.5ch; cursor:pointer;' });
                const input = webui.create('input', { type: 'checkbox', name });
                input.checked = on;
                label.append(input, document.createTextNode(text));
                options.appendChild(label);
                return input;
            };
            const opening = box('opening', 'Start with "Lorem ipsum dolor sit amet"', true);
            const html = box('html', 'HTML tags', false);
            const output = webui.create('app-tool-output', { label: 'Placeholder text', language: 'text' });
            const stats = webui.create('p', { class: 'lorem-stats', style: 'margin:0; opacity:0.8;' });
            wrap.append(row, options, output, stats);
            t.replaceChildren(wrap);

            const run = () => {
                const current = kind.value || 'paragraphs';
                const limit = LIMITS[current];
                const n = Math.min(limit, Math.max(1, parseInt(count.value) || 1));
                const items = generate(current, n, opening.checked);
                const text = format(items, current, html.checked);
                output.setAttribute('language', html.checked ? 'html' : 'text');
                output.setValue(text);
                const plain = items.join(' ');
                const wordCount = plain.split(/\s+/).filter(Boolean).length;
                stats.innerText = `${wordCount.toLocaleString()} words, ${plain.length.toLocaleString()} characters.${(parseInt(count.value) || 0) > limit ? ` Limited to ${limit} ${current === 'list' ? 'list items' : current}.` : ''}`;
            };
            await Promise.all(['webui-input-text', 'webui-dropdown', 'webui-button', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            const setLimit = () => count.setAttribute('max', LIMITS[kind.value || 'paragraphs']);
            kind.addEventListener('change', () => { setLimit(); run(); });
            button.addEventListener('click', run);
            count.addEventListener('change', run);
            opening.addEventListener('change', run);
            html.addEventListener('change', run);
            setLimit();
            run();
        },
    });
}
