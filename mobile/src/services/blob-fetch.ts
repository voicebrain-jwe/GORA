/** Browser transport used only by the Vercel Blob SDK (see vite.config.ts). */
export function hasNativeBlobTransport(): boolean {
  return typeof (globalThis as typeof globalThis & {
    CapacitorWebFetch?: typeof globalThis.fetch;
  }).CapacitorWebFetch === 'function';
}

export const fetch: typeof globalThis.fetch = async (input, init) => {
  const webFetch = (globalThis as typeof globalThis & {
    CapacitorWebFetch?: typeof globalThis.fetch;
  }).CapacitorWebFetch;
  if (!webFetch) return globalThis.fetch(input, init);

  // Capacitor's native bridge decodes streams as text and cannot serialize Blob
  // parts. The storage service supports CORS, so send bytes with the original
  // browser fetch instead. Buffer each SDK part to avoid WebView streaming
  // request limitations. Never replace global fetch: the API still needs it.
  const body = init?.body;
  const options = body instanceof ReadableStream
    ? { ...init, body: await new Response(body).blob() }
    : init;
  return webFetch.call(globalThis, input, options);
};
