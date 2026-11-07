import wasmInit, * as procs from '/webapp.js';

// Calls can arrive while the WebAssembly is still loading, so each one waits for it.
const ready = wasmInit();

self.onmessage = async (msg) => {
    if (!msg.isTrusted) return;
    const { id, run, data } = msg.data;
    const message = await processMessage(run, data);
    // Hand binary results, such as a PDF, back without copying them.
    const transfer = message.ok && ArrayBuffer.isView(message.msg) ? [message.msg.buffer] : [];
    postMessage({ id, message }, transfer);
};

async function processMessage(run, data) {
    if (!run) return { ok: false, msg: 'Missing run' };
    try {
        await ready;
    } catch (ex) {
        return { ok: false, msg: `The tool engine failed to load: ${ex}` };
    }
    const proc = procs[run];
    if (typeof proc !== 'function') return { ok: false, msg: `Unknown worker function: ${run}` };
    try {
        return { ok: true, msg: await proc(...(data || [])) };
    } catch (ex) {
        console.error('worker proc failed', ex);
        return { ok: false, msg: ex instanceof Error ? ex.message : ex };
    }
}

self.onerror = (error) => {
    console.error("Unhandled error in worker:", error);
};
