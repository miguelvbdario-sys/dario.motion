// Decodes image files into ImageBitmaps off the main thread (used by
// src/lib/frameSequence.ts). Safari decodes createImageBitmap(blob) partly on
// the page's main thread; here the page never waits on a decode.
self.onmessage = async (e) => {
  const { id, blob } = e.data;
  try {
    const bitmap = await createImageBitmap(blob);
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
