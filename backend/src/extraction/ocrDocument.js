// The "OCR document" is the one standard input shape for the whole extraction
// system. The real scanner (Tesseract) and the automated tests both produce
// this same shape, so the extractor never needs to know where the text came from.
//
//   {
//     imageWidth, imageHeight,
//     lines: [
//       { index, text, confidence /* 0-100 */, bbox: { x0, y0, x1, y1 } }
//     ]
//   }

const DEFAULT_CONFIDENCE = 90
const LEFT_MARGIN = 40
const CHAR_WIDTH = 14

// Builds an OCR document from simple test data.
// Each entry is either a plain string, or { text, confidence?, bbox? }.
// Positions are generated from line order, so fixtures stay easy to write by hand.
export function buildOcrDocument(rawLines, { width = 800, lineHeight = 40 } = {}) {
  const lines = rawLines.map((entry, index) => {
    const item = typeof entry === 'string' ? { text: entry } : entry
    const text = String(item.text ?? '')
    const y0 = index * lineHeight + 20

    return {
      index,
      text,
      confidence: item.confidence ?? DEFAULT_CONFIDENCE,
      bbox: item.bbox ?? {
        x0: LEFT_MARGIN,
        y0,
        x1: Math.min(width - LEFT_MARGIN, LEFT_MARGIN + text.length * CHAR_WIDTH),
        y1: y0 + lineHeight - 8,
      },
    }
  })

  return {
    imageWidth: width,
    imageHeight: rawLines.length * lineHeight + 40,
    lines,
  }
}
