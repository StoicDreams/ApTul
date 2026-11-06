/*!
 * Ap Tul Case Converter
 * Converts text between upper, lower, title, and sentence case, and code cases such as camelCase.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /** Words in a name, split at spaces, punctuation, and changes from lower to upper case: "XMLHttpRequest" gives XML, Http, Request. */
    function words(line) {
        return line
            .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, '$1 $2')
            .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
            .split(/[^\p{L}\p{N}]+/u)
            .filter(Boolean);
    }

    const capitalize = word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    /** Each conversion works line by line, so a list of names converts as a list. */
    const CASES = [
        ['UPPER CASE', line => line.toUpperCase()],
        ['lower case', line => line.toLowerCase()],
        ['Title Case', line => line.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, space, letter) => space + letter.toUpperCase())],
        ['Sentence case', line => line.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, before, letter) => before + letter.toUpperCase())],
        ['camelCase', line => words(line).map((w, i) => i ? capitalize(w) : w.toLowerCase()).join('')],
        ['PascalCase', line => words(line).map(capitalize).join('')],
        ['snake_case', line => words(line).map(w => w.toLowerCase()).join('_')],
        ['kebab-case', line => words(line).map(w => w.toLowerCase()).join('-')],
        ['CONSTANT_CASE', line => words(line).map(w => w.toUpperCase()).join('_')],
    ];

    webui.define('app-case-converter', {
        preload: 'flex input-message',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const input = webui.create('webui-input-message', { label: 'Text', placeholder: 'Type or paste text, such as a sentence or a list of names', rows: 6 });
            const results = webui.create('div', { class: 'case-results', style: 'display:flex; flex-direction:column; gap:var(--padding);' });
            const codes = CASES.map(([name]) => {
                const code = webui.create('app-tool-output', { lang: 'text', label: name, 'data-case': name });
                results.appendChild(code);
                return code;
            });
            results.style.display = 'none';
            wrap.append(input, results);
            t.replaceChildren(wrap);

            const update = () => {
                const text = input.value || '';
                results.style.display = text ? 'flex' : 'none';
                if (!text) return;
                const lines = text.split('\n');
                CASES.forEach(([, convert], i) => codes[i].setValue(lines.map(convert).join('\n')));
            };
            await Promise.all(['webui-input-message', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', update);
            update();
        },
    });
}
