/*!
 * Web UI JWT Parser
 * A component for decoding and inspecting JSON Web Tokens (client-side).
 * Authored by Erik Gassler - Stoic Dreams
 * Copyright © 2026 Stoic Dreams - https://www.stoicdreams.com
 * Licensed under the MIT license - https://github.com/StoicDreams/MyFiCDN/blob/main/LICENSE
 */
"use strict"
{
    function decodeBase64Url(str) {
        try {
            return JSON.parse(webui.fromBase64(str));
        } catch (e) {
            throw new Error("Invalid Base64 or JSON structure.");
        }
    }
    // Helper to format UNIX timestamps to readable dates
    function formatTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleString();
    }
    webui.define('app-jwt-parser', {
        preload: 'flex input-message code grid alert card',
        constructor: t => {
            t.token = '';
        },
        connected: t => {
            t.render();
        },
        render: function () {
            const t = this;
            t.innerHTML = '';
            const wrap = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            t.appendChild(wrap);
            // --- 1. Input Section ---
            const inputContainer = webui.create('webui-card', { elevation: 5 });
            wrap.appendChild(inputContainer);
            const input = webui.create('webui-input-message', {
                label: 'Encoded Token',
                placeholder: 'Paste your JWT here (eyJ...)',
                rows: 3,
                value: t.token
            });
            inputContainer.appendChild(input);
            // Container for Results
            const resultContainer = webui.create('webui-flex', { column: true, gap: 'var(--padding)' });
            wrap.appendChild(resultContainer);
            // --- 2. Logic: Process on Input ---
            const processToken = (rawToken) => {
                resultContainer.innerHTML = ''; // Clear previous results
                if (!rawToken || !rawToken.trim()) return;
                const parts = rawToken.split('.');
                if (parts.length !== 3) {
                    resultContainer.appendChild(webui.create('webui-alert', {
                        theme: 'danger',
                        text: 'Invalid Token Format: A JWT must consist of three parts separated by dots.',
                        show: true
                    }));
                    return;
                }
                try {
                    const [rawHeader, rawPayload, rawSignature] = parts;
                    const header = decodeBase64Url(rawHeader);
                    const payload = decodeBase64Url(rawPayload);
                    const headerSigGroup = webui.create('webui-side-by-side');
                    const headerSection = webui.create('webui-card', { elevation: 2 });
                    const payloadSection = webui.create('webui-card', { elevation: 2 });
                    const sigSection = webui.create('webui-card', { elevation: 2 });
                    resultContainer.appendChild(payloadSection);
                    resultContainer.appendChild(headerSigGroup);
                    // --- Header Section ---
                    const headerCode = webui.create('webui-code', { label: 'Header', lang: 'json' });
                    headerCode.setValue(JSON.stringify(header, null, 2));
                    headerSection.appendChild(headerCode);
                    headerSigGroup.appendChild(headerSection);
                    // --- Payload Section ---
                    if (payload.exp || payload.iat || payload.nbf) {
                        const hints = webui.create('webui-grid', { columns: 'auto 1fr', gap: '8px', style: 'margin-bottom: 10px; font-size: 0.9em;' });
                        if (payload.iat) {
                            hints.appendChild(webui.create('strong', { text: 'Issued At (iat):' }));
                            hints.appendChild(webui.create('span', { text: formatTime(payload.iat) }));
                        }
                        if (payload.exp) {
                            const isExpired = (Date.now() / 1000) > payload.exp;
                            const color = isExpired ? 'red' : 'green';
                            const status = isExpired ? '(Expired)' : '(Valid)';

                            hints.appendChild(webui.create('strong', { text: 'Expires (exp):' }));
                            hints.appendChild(webui.create('span', { html: `${formatTime(payload.exp)} <span style="color:${color}; font-weight:bold;">${status}</span>` }));
                        }
                        payloadSection.appendChild(hints);
                    }
                    const payloadCode = webui.create('webui-code', { label: 'Primary', lang: 'json' });
                    payloadCode.setValue(JSON.stringify(payload, null, 2));
                    payloadSection.appendChild(payloadCode);
                    // --- Signature Section ---
                    const sigCode = webui.create('webui-code', { label: 'Signature', lang: 'text' });
                    sigCode.setValue(rawSignature);
                    sigSection.appendChild(sigCode);
                    headerSigGroup.appendChild(sigSection);
                } catch (ex) {
                    resultContainer.appendChild(webui.create('webui-alert', {
                        theme: 'danger',
                        text: `Decoding Failed: ${ex.message}`,
                        show: true
                    }));
                }
            };
            input.addEventListener('input', (e) => processToken(e.target.value));
            if (t.token) {
                input.value = t.token;
                processToken(t.token);
            }
        }
    });
}
