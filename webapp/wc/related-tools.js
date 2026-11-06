/*!
 * Ap Tul Related Tools
 * Lists other tools from /tools.json, starting with tools in the same category as the current page.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-related-tools></app-related-tools>
     * <app-related-tools category="image" limit="3"></app-related-tools>
     *
     * category: list this category first, instead of the current page's category.
     * limit: how many tools to show (default 6).
     */
    let registry = null;
    /** Load /tools.json once for every instance on the site. */
    function loadRegistry() {
        if (!registry) {
            registry = fetch('/tools.json')
                .then(res => res.ok ? res.json() : { categories: [], tools: [] })
                .catch(() => ({ categories: [], tools: [] }));
        }
        return registry;
    }
    function samePath(a, b) {
        const clean = path => (path || '').toLowerCase().replace(/\/+$/, '') || '/';
        return clean(a) === clean(b);
    }
    webui.define('app-related-tools', {
        preload: 'cards card',
        attr: ['category', 'limit', 'heading'],
        connected() {
            this.render();
        },
        attrChanged(property, value) {
            if (this._rendered) this.render();
        },
        async render() {
            const t = this;
            t._rendered = true;
            const { tools = [] } = await loadRegistry();
            const current = tools.find(tool => samePath(tool.url, location.pathname));
            const category = t.category || current?.category;
            const limit = parseInt(t.limit) || 6;
            const others = tools.filter(tool => tool !== current);
            const related = [
                ...others.filter(tool => tool.category === category),
                ...others.filter(tool => tool.category !== category),
            ].slice(0, limit);
            const content = document.createDocumentFragment();
            if (related.length) {
                content.appendChild(webui.create('h2', { text: t.heading || 'Related Tools' }));
                const cards = webui.create('webui-cards', { 'card-width': 280 });
                related.forEach(tool => {
                    cards.appendChild(webui.create('webui-card', {
                        name: tool.name,
                        avatar: tool.icon,
                        link: tool.url,
                        text: tool.description,
                    }));
                });
                content.appendChild(cards);
            }
            t.replaceChildren(content);
        },
    });
}
