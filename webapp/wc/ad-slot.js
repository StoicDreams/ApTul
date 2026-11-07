/*!
 * Ap Tul Ad Slot
 * A place for one ad. Shows nothing until an ad network is set up in appConfig.json.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-ad-slot name="content"></app-ad-slot>
     *
     * Ads are set up in root_files/appConfig.json:
     *
     *     "ads": {
     *         "network": "adsense",
     *         "client": "ca-pub-0000000000000000",
     *         "slots": { "content": "1234567890", "footer": "2345678901" }
     *     }
     *
     * A slot with no matching entry in "slots" stays hidden and takes no space. A slot that has one reserves its
     * height straight away, so the page does not jump when the ad arrives, then loads the ad the first time it
     * scrolls into view. The ad script loads once, with the first ad.
     */
    let config = null;
    let script = null;

    /** The ads settings, read once per visit. appConfig.json loads on its own schedule, so read the file directly. */
    function getAdsConfig() {
        if (!config) {
            config = fetch('/appConfig.json')
                .then(response => response.ok ? response.json() : {})
                .then(data => data && data.ads && data.ads.client ? data.ads : null)
                .catch(() => null);
        }
        return config;
    }

    function loadAdSense(client) {
        if (!script) {
            script = new Promise((resolve, reject) => {
                const tag = webui.create('script', {
                    async: true,
                    crossorigin: 'anonymous',
                    src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`,
                });
                tag.addEventListener('load', resolve);
                tag.addEventListener('error', reject);
                document.head.appendChild(tag);
            });
        }
        return script;
    }

    webui.define('app-ad-slot', {
        attr: ['name'],
        watchVisibility: true,
        constructor() {
            const t = this;
            t._ads = null;
            t._loaded = false;
        },
        async connected() {
            const t = this;
            const ads = await getAdsConfig();
            const slot = ads && ads.slots && ads.slots[t.name];
            if (!slot) return;
            t._ads = ads;
            t._slot = `${slot}`;
            t.setAttribute('ready', '');
            if (t.hasAttribute('visible')) t.load();
        },
        attrChanged(property, value) {
            const t = this;
            if (property === 'visible' && value !== null && value !== undefined && value !== false) {
                t.load();
            }
        },
        /** Add the ad the first time the slot is ready and in view. Moving the slot later keeps the same ad. */
        async load() {
            const t = this;
            if (t._loaded || !t._ads) return;
            t._loaded = true;
            switch (t._ads.network || 'adsense') {
                case 'adsense': {
                    const label = webui.create('div', { class: 'ad-label', text: 'Advertisement' });
                    const unit = webui.create('ins', {
                        class: 'adsbygoogle',
                        style: 'display:block',
                        'data-ad-client': t._ads.client,
                        'data-ad-slot': t._slot,
                        'data-ad-format': 'auto',
                        'data-full-width-responsive': 'true',
                    });
                    t.replaceChildren(label, unit);
                    try {
                        await loadAdSense(t._ads.client);
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    } catch {
                        // Blocked or offline: leave the reserved space empty rather than showing an error.
                        t.setAttribute('failed', '');
                    }
                    break;
                }
            }
        },
        // The ad stays in the page itself, through the slot, because ad scripts only look for their tags there.
        shadowTemplate: `
<slot></slot>
<style type="text/css">
:host { display:none; }
:host([ready]) { display:block; min-height:280px; margin:calc(2 * var(--padding, 1em)) 0; text-align:center; }
::slotted(.ad-label) { font-size:0.75rem; opacity:0.7; margin-bottom:0.25rem; }
</style>
`
    });
}
