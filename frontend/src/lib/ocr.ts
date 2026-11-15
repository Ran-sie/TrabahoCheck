/**
 * Reads the text out of a screenshot, fully inside the browser.
 * The image never leaves the user's device; only the extracted text is checked.
 * tesseract.js is loaded on demand so it does not slow down the first page load.
 */
export async function readImageText(
  image: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const { recognize } = await import('tesseract.js')

  const { data } = await recognize(image, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100))
    },
  })

  return data.text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/** Largest image we will try to read (phone screenshots are usually 1-4 MB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
