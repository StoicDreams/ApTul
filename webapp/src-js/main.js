// webui.worker runs Rust functions in a Web Worker: `await webui.worker.process_image(...)`.
// The worker, and the WebAssembly it loads, only start with the first call, so pages without a tool that
// needs them never download it.
{
    let worker = null;
    const pending = new Map();

    function failAll(reason) {
        for (const { reject } of pending.values()) reject(reason);
        pending.clear();
    }

    function startWorker() {
        worker = new Worker(new URL('/worker.js', import.meta.url), { type: 'module' });
        worker.onmessage = msg => {
            if (!msg.isTrusted) return;
            const { id, message } = msg.data;
            const call = pending.get(id);
            if (!call) return;
            pending.delete(id);
            if (message && message.ok) {
                call.resolve(message.msg);
            } else {
                call.reject(message ? message.msg : 'The worker did not return a result');
            }
        };
        worker.onerror = error => {
            console.error('Main thread: Worker error:', error);
            // A worker that failed to load never answers, so fail the waiting calls rather than leave them hanging.
            failAll('The worker failed to start');
            worker = null;
        };
        call('init_panic_hook').catch(() => { });
    }

    function call(name, ...args) {
        if (!window.Worker) return Promise.reject('Web Workers are not supported in this browser');
        if (!worker) startWorker();
        const id = webui.uuid();
        return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
            worker.postMessage({ id, run: name, data: args });
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        webui.worker = new Proxy({}, {
            get(_, name) {
                if (typeof name !== 'string' || name === 'then') return undefined;
                const func = webui.toSnake(name).replace(/-/g, '_');
                return (...args) => call(func, ...args);
            }
        });
    });
}
