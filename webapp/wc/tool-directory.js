/*!
 * Ap Tul Tool Directory
 * Every tool from /tools.json, grouped by category, with a search box.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-tool-directory>
     *
     * - [Tool Name](/tool-url): What it does.
     *
     * </app-tool-directory>
     *
     * Put a plain list of tool links inside, so the static page that search engines read links to every tool.
     * Once the component loads, it replaces that list with the searchable directory.
     * tests/tools.spec.mjs checks that the list matches tools.json.
     */
    let registry = null;
    function loadRegistry() {
        if (!registry) {
            registry = fetch('/tools.json')
                .then(res => res.ok ? res.json() : { categories: [], tools: [] })
                .catch(() => ({ categories: [], tools: [] }));
        }
        return registry;
    }
    /** Lowercase words to match, so "png webp" finds tools that mention both. */
    function searchWords(text) {
        return (text || '').toLowerCase().split(/\s+/).filter(Boolean);
    }
    webui.define('app-tool-directory', {
        preload: 'cards card input-text',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const { categories = [], tools = [] } = await loadRegistry();
            if (!tools.length) return;
            const content = document.createDocumentFragment();
            t._search = webui.create('webui-input-text', {
                label: 'Search tools',
                placeholder: 'Try "webp", "json", or "token"',
                type: 'search',
            });
            content.appendChild(t._search);
            t._sections = [];
            categories.forEach(category => {
                const inCategory = tools.filter(tool => tool.category === category.id);
                if (!inCategory.length) return;
                const section = webui.create('section', { 'data-category': category.id });
                section.appendChild(webui.create('h2', { text: category.name }));
                const cards = webui.create('webui-cards', { 'card-width': 280 });
                const entries = inCategory.map(tool => {
                    const card = webui.create('webui-card', {
                        name: tool.name,
                        avatar: tool.icon,
                        link: tool.url,
                        text: tool.description,
                    });
                    cards.appendChild(card);
                    return { card, text: `${tool.name} ${tool.description} ${category.name}`.toLowerCase() };
                });
                section.appendChild(cards);
                content.appendChild(section);
                t._sections.push({ section, entries });
            });
            t._empty = webui.create('p', { text: 'No tools match your search.', class: 'no-results' });
            t._empty.style.display = 'none';
            content.appendChild(t._empty);
            t._search.addEventListener('input', _ => t.filter(t._search.value));
            t.replaceChildren(content);
        },
        /** Show only tools whose name, description, or category contains every word searched for. */
        filter(query) {
            const t = this;
            if (!t._sections) return;
            const words = searchWords(query);
            let shown = 0;
            t._sections.forEach(({ section, entries }) => {
                let inSection = 0;
                entries.forEach(({ card, text }) => {
                    const match = words.every(word => text.includes(word));
                    card.style.display = match ? '' : 'none';
                    if (match) inSection++;
                });
                section.style.display = inSection ? '' : 'none';
                shown += inSection;
            });
            t._empty.style.display = shown ? 'none' : '';
        },
    });
}
