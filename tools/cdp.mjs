// Small CDP helper for Electron's out-of-process webview frames.
export async function connect(url) {
  const socket = new WebSocket(url),
    pending = new Map(),
    contexts = new Set();
  let next = 0;
  socket.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p?.reject(Error(m.error.message));
      else p?.resolve(m.result);
    } else if (m.method === "Runtime.executionContextCreated")
      contexts.add(m.params.context.id);
    else if (m.method === "Runtime.executionContextDestroyed")
      contexts.delete(m.params.executionContextId);
    else if (m.method === "Runtime.executionContextsCleared") contexts.clear();
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  await send("Runtime.enable");
  return { contexts, send, close: () => socket.close() };
}
