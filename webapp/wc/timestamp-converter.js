/*!
 * Ap Tul Unix Timestamp Converter
 * Converts between Unix timestamps and readable dates, in UTC and local time.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /**
     * Read a timestamp or date. Numbers are taken as seconds, milliseconds, microseconds, or nanoseconds
     * from their size, the same guess most tools make. Returns { ms, unit } or throws with a readable message.
     */
    function parseInput(text) {
        const value = text.trim();
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            const number = parseFloat(value);
            const digits = value.replace(/^-/, '').split('.')[0].length;
            if (digits >= 18) return { ms: number / 1e6, unit: 'nanoseconds' };
            if (digits >= 15) return { ms: number / 1e3, unit: 'microseconds' };
            if (digits >= 12) return { ms: number, unit: 'milliseconds' };
            return { ms: number * 1000, unit: 'seconds' };
        }
        // Safari only reads "2026-01-31 14:30" with a T between the date and time.
        const ms = Date.parse(value.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2'));
        if (isNaN(ms)) throw new Error('Enter a Unix timestamp, such as 1700000000, or a date, such as 2026-01-31 14:30.');
        return { ms, unit: 'date' };
    }

    function relative(ms) {
        const seconds = Math.round((ms - Date.now()) / 1000);
        const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
        const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
        for (const [unit, size] of units) {
            if (Math.abs(seconds) >= size || unit === 'second') {
                return format.format(Math.round(seconds / size), unit);
            }
        }
    }

    /** Every format shown for a moment in time, in display order. */
    function describe(ms) {
        const date = new Date(ms);
        if (isNaN(date.getTime())) throw new Error('That date is outside the range JavaScript dates can show.');
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return [
            ['Unix timestamp (seconds)', `${Math.floor(ms / 1000)}`],
            ['Unix timestamp (milliseconds)', `${Math.floor(ms)}`],
            ['ISO 8601 (UTC)', date.toISOString()],
            ['UTC', date.toUTCString()],
            [`Your time zone (${zone})`, date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })],
            ['Relative', relative(ms)],
        ];
    }

    webui.define('app-timestamp-converter', {
        preload: 'flex input-message button alert',
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const row = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'end' });
            const input = webui.create('webui-input-message', {
                label: 'Timestamp or date',
                placeholder: 'For example 1700000000, 1700000000000, or 2026-01-31 14:30',
                rows: 1,
                style: 'flex:1 1 24rem;',
            });
            const now = webui.create('webui-button', { theme: 'primary', text: 'Now' });
            row.append(input, now);
            const status = webui.create('webui-alert', { show: false });
            // One output per format, created up front so their component loads with the page. Empty outputs hide themselves.
            const results = webui.create('div', { class: 'time-results', style: 'display:flex; flex-direction:column; gap:var(--padding);' });
            const outputs = describe(Date.now()).map(([label]) => {
                const output = webui.create('app-tool-output', { lang: 'text', label });
                results.appendChild(output);
                return output;
            });
            wrap.append(row, status, results);
            t.replaceChildren(wrap);

            const clear = () => outputs.forEach(output => output.setValue(''));
            const update = () => {
                status.removeAttribute('show');
                const text = input.value || '';
                if (!text.trim()) {
                    clear();
                    return;
                }
                try {
                    const { ms, unit } = parseInput(text);
                    describe(ms).forEach(([, value], i) => outputs[i].setValue(value));
                    if (unit !== 'date') status.setValue({ text: `Read as ${unit}.` }, 'info');
                } catch (error) {
                    clear();
                    status.setValue({ text: error.message }, 'danger');
                }
            };
            const setNow = () => {
                input.setValue(`${Math.floor(Date.now() / 1000)}`);
                update();
            };
            await Promise.all(['webui-input-message', 'webui-button', 'webui-alert', 'app-tool-output'].map(tag => customElements.whenDefined(tag)));
            input.addEventListener('input', update);
            now.addEventListener('click', setNow);
            if (input.value) update(); else setNow();
        },
    });
}
