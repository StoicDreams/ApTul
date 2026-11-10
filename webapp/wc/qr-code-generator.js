/*!
 * Ap Tul QR Code Generator
 * Makes QR codes for links, text, Wi-Fi, email, phone numbers, and text messages, as PNG or SVG.
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    /*
     * <app-qr-code-generator></app-qr-code-generator>
     * <app-qr-code-generator type="wifi"></app-qr-code-generator>
     *
     * type: the kind of code chosen when the page opens: text, wifi, email, phone, or sms.
     * Rust builds the code as SVG in the worker. PNG files are drawn from the SVG at the chosen size.
     */
    const TYPES = {
        text: {
            fields: [['text', 'Link or text', 'https://example.com', 3]],
            build: f => f.text,
        },
        wifi: {
            fields: [['ssid', 'Network name (SSID)', 'MyHomeWiFi', 1], ['password', 'Password', 'Leave empty for an open network', 1]],
            build: (f, o) => {
                if (!f.ssid) return '';
                const security = f.password ? o.security : 'nopass';
                const password = f.password && security !== 'nopass' ? `P:${escapeWifi(f.password)};` : '';
                return `WIFI:T:${security};S:${escapeWifi(f.ssid)};${password}${o.hidden ? 'H:true;' : ''};`;
            },
        },
        email: {
            fields: [['to', 'Email address', 'name@example.com', 1], ['subject', 'Subject', 'Optional', 1], ['body', 'Message', 'Optional', 3]],
            build: f => {
                if (!f.to) return '';
                const query = [['subject', f.subject], ['body', f.body]]
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                    .join('&');
                return `mailto:${f.to.trim()}${query ? `?${query}` : ''}`;
            },
        },
        phone: {
            fields: [['number', 'Phone number', '+1 555 123 4567', 1]],
            build: f => f.number ? `tel:${cleanNumber(f.number)}` : '',
        },
        sms: {
            fields: [['number', 'Phone number', '+1 555 123 4567', 1], ['message', 'Message', 'Optional', 3]],
            build: f => f.number ? `SMSTO:${cleanNumber(f.number)}:${f.message || ''}` : '',
        },
    };

    /** Wi-Fi codes use backslashes before these characters, so names and passwords containing them still work. */
    function escapeWifi(text) {
        return text.replace(/([\\;,:"])/g, '\\$1');
    }

    /** Phones dial digits and a leading plus, so spaces, dashes, and brackets are removed. */
    function cleanNumber(text) {
        const trimmed = text.trim();
        return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/[^\d]/g, '');
    }

    function luminance(hex) {
        const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function contrast(a, b) {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (high + 0.05) / (low + 0.05);
    }

    function svgImage(svg) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject('The QR code could not be drawn.');
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        });
    }

    function save(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = webui.create('a', { href: url, download: filename });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    webui.define('app-qr-code-generator', {
        preload: 'flex dropdown input-message button alert',
        attr: ['type'],
        connected() {
            this.render();
        },
        async render() {
            const t = this;
            const startType = TYPES[t.getAttribute('type')] ? t.getAttribute('type') : 'text';
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            const row = webui.create('webui-flex', { wrap: true, gap: 'var(--padding)', align: 'end' });
            const type = webui.create('webui-dropdown', {
                label: 'Type', value: startType, style: 'flex:1 1 12rem; max-width:18rem;',
                options: 'Link or Text|text,Wi-Fi|wifi,Email|email,Phone Call|phone,Text Message|sms',
            });
            const level = webui.create('webui-dropdown', {
                label: 'Error Correction', value: 'M', style: 'flex:1 1 12rem; max-width:18rem;',
                options: 'Low (7%)|L,Medium (15%)|M,Quartile (25%)|Q,High (30%)|H',
            });
            row.append(type, level);

            // Every field is created up front, then shown for the types that use it.
            const fieldBox = webui.create('div', { class: 'qr-fields', style: 'display:flex; flex-direction:column; gap:var(--padding);' });
            const fields = {};
            for (const [name, def] of Object.entries(TYPES)) {
                for (const [key, label, placeholder, rows] of def.fields) {
                    const id = `${name}-${key}`;
                    const input = webui.create('webui-input-message', { label, placeholder, rows, 'data-field': id });
                    fields[id] = input;
                    fieldBox.appendChild(input);
                }
            }
            const wifiOptions = webui.create('div', { class: 'wifi-options', style: 'display:flex; flex-wrap:wrap; gap:var(--padding); align-items:end;' });
            const security = webui.create('webui-dropdown', { label: 'Security', value: 'WPA', options: 'WPA/WPA2/WPA3|WPA,WEP|WEP', style: 'flex:0 1 14rem;' });
            const hiddenLabel = webui.create('label', { style: 'display:flex; align-items:center; gap:0.5ch; cursor:pointer;' });
            const hidden = webui.create('input', { type: 'checkbox', name: 'hidden' });
            hiddenLabel.append(hidden, document.createTextNode('Hidden network'));
            wifiOptions.append(security, hiddenLabel);
            fieldBox.appendChild(wifiOptions);

            const colors = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:calc(2 * var(--padding)); align-items:center;' });
            const picker = (label, value, name) => {
                const box = webui.create('label', { style: 'display:flex; align-items:center; gap:1ch; cursor:pointer;' });
                const input = webui.create('input', { type: 'color', value, name, style: 'width:3rem; height:2.5rem; cursor:pointer;' });
                box.append(input, document.createTextNode(label));
                colors.appendChild(box);
                return input;
            };
            const dark = picker('Code color', '#000000', 'dark');
            const light = picker('Background', '#ffffff', 'light');

            const status = webui.create('webui-alert', { show: false });
            const result = webui.create('div', { class: 'qr-result', style: 'display:none; flex-direction:column; align-items:center; gap:var(--padding);' });
            const preview = webui.create('img', { class: 'qr-preview', alt: 'QR code preview', style: 'width:min(256px, 100%); height:auto; image-rendering:pixelated;' });
            const actions = webui.create('div', { style: 'display:flex; flex-wrap:wrap; gap:var(--padding); align-items:end; justify-content:center;' });
            const size = webui.create('webui-dropdown', { label: 'PNG Size', value: '1024', options: '256 px|256,512 px|512,1024 px|1024,2048 px|2048', style: 'flex:0 1 10rem;' });
            const png = webui.create('webui-button', { theme: 'primary', text: 'Download PNG', class: 'download-png' });
            const svgButton = webui.create('webui-button', { theme: 'secondary', text: 'Download SVG', class: 'download-svg' });
            const copyButton = webui.create('webui-button', { theme: 'tertiary', text: 'Copy Image', class: 'copy-image' });
            actions.append(size, png, svgButton, copyButton);
            result.append(preview, actions);
            wrap.append(row, fieldBox, colors, status, result);
            t.replaceChildren(wrap);

            let svg = '';
            let runId = 0;
            let timer = null;

            const showFields = () => {
                const current = type.value || 'text';
                for (const [id, input] of Object.entries(fields)) {
                    input.style.display = id.startsWith(`${current}-`) ? '' : 'none';
                }
                wifiOptions.style.display = current === 'wifi' ? 'flex' : 'none';
            };
            const content = () => {
                const current = type.value || 'text';
                const values = {};
                for (const [key] of TYPES[current].fields) values[key] = fields[`${current}-${key}`].value || '';
                return TYPES[current].build(values, { security: security.value || 'WPA', hidden: hidden.checked });
            };
            const update = async () => {
                const id = ++runId;
                status.removeAttribute('show');
                const text = content();
                if (!text) {
                    svg = '';
                    result.style.display = 'none';
                    return;
                }
                try {
                    const made = await webui.worker.qr_code(text, level.value || 'M', dark.value, light.value);
                    if (id !== runId) return;
                    svg = made;
                    preview.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                    result.style.display = 'flex';
                    const ratio = contrast(dark.value, light.value);
                    if (luminance(dark.value) > luminance(light.value)) {
                        status.setValue({ text: 'The code is lighter than its background. Many phone cameras cannot read light codes on dark backgrounds, so test it before printing.' }, 'warning');
                    } else if (ratio < 4) {
                        status.setValue({ text: 'The code and background colors are close, which can make the code hard to scan. Use a darker code color or a lighter background.' }, 'warning');
                    }
                } catch (error) {
                    if (id !== runId) return;
                    svg = '';
                    result.style.display = 'none';
                    status.setValue({ text: `${error}` }, 'danger');
                }
            };
            const schedule = () => {
                clearTimeout(timer);
                timer = setTimeout(update, 150);
            };

            await Promise.all(['webui-dropdown', 'webui-input-message', 'webui-button', 'webui-alert'].map(tag => customElements.whenDefined(tag)));
            showFields();
            type.addEventListener('change', () => { showFields(); schedule(); });
            [level, security].forEach(el => el.addEventListener('change', schedule));
            Object.values(fields).forEach(el => el.addEventListener('input', schedule));
            [dark, light].forEach(el => el.addEventListener('input', schedule));
            hidden.addEventListener('change', schedule);
            svgButton.addEventListener('click', () => {
                if (svg) save(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
            });
            /** The code as a PNG at the chosen size. */
            const pngBlob = async () => {
                const pixels = parseInt(size.value) || 1024;
                const img = await svgImage(svg);
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = pixels;
                const context = canvas.getContext('2d');
                // Keep the squares sharp instead of blurring their edges.
                context.imageSmoothingEnabled = false;
                context.drawImage(img, 0, 0, pixels, pixels);
                return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject('The QR code could not be drawn.'), 'image/png'));
            };
            png.addEventListener('click', async () => {
                if (!svg) return;
                save(await pngBlob(), 'qr-code.png');
            });
            let copyTimer = null;
            copyButton.addEventListener('click', async () => {
                if (!svg) return;
                if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) {
                    status.setValue({ text: 'This browser cannot copy images. Use Download PNG instead.' }, 'warning');
                    return;
                }
                try {
                    // Safari only allows the copy while the click is being handled, so the PNG is passed as a promise.
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob() })]);
                    copyButton.innerText = 'Copied';
                    clearTimeout(copyTimer);
                    copyTimer = setTimeout(() => copyButton.innerText = 'Copy Image', 1500);
                } catch (error) {
                    status.setValue({ text: 'The image could not be copied. Your browser may need permission, or use Download PNG instead.' }, 'warning');
                }
            });
            update();
        },
    });
}
