/**
 * Heuristic: shoes vs clothing from filename/aspect (not used by the try-on API route, which always sends `tryon` with product+model images).
 * Uses filename keywords + aspect ratio from image dimensions.
 */

export type GarmentKind = "shoes" | "clothing";

function looksLikeShoesByName(name: string) {
  return /(shoe|sneaker|boot|heel|loafer|sandal|footwear|trainer|cleat|slipper|mule)/i.test(
    name,
  );
}

function looksLikeClothingByName(name: string) {
  return /(shirt|tee|t-?shirt|dress|coat|jacket|hoodie|sweater|cardigan|pants|jeans|trouser|shorts|skirt|blouse|top|suit|blazer|vest|knit|polo|jumper)/i.test(
    name,
  );
}

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null;
  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 0;
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    while (i < bytes.length && bytes[i] === 0xff) i += 1;
    if (i >= bytes.length) break;
    const marker = bytes[i];
    i += 1;

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (i + 1 >= bytes.length) break;
    const segLen = (bytes[i] << 8) | bytes[i + 1];
    if (segLen < 2) break;
    const dataStart = i + 2;
    const dataEnd = i + segLen;
    if (dataEnd > bytes.length) break;

    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    // SOF segment after length: precision (1), height (2), width (2), ...
    if (isSof && dataStart + 6 < dataEnd) {
      const h = (bytes[dataStart + 1] << 8) | bytes[dataStart + 2];
      const w = (bytes[dataStart + 3] << 8) | bytes[dataStart + 4];
      if (w > 0 && h > 0) return { width: w, height: h };
    }

    i = dataEnd;
  }
  return null;
}

export function getImageDimensionsFromBytes(buffer: ArrayBuffer): {
  width: number;
  height: number;
} | null {
  const bytes = new Uint8Array(buffer);
  const png = parsePngDimensions(bytes);
  if (png) return png;
  const jpg = parseJpegDimensions(bytes);
  if (jpg) return jpg;
  return null;
}

export function detectGarmentKind(params: {
  fileName: string;
  width: number;
  height: number;
}): GarmentKind {
  const { fileName, width, height } = params;
  const ratio = width / height;

  const shoeName = looksLikeShoesByName(fileName);
  const clothingName = looksLikeClothingByName(fileName);

  if (shoeName && !clothingName) return "shoes";
  if (clothingName && !shoeName) return "clothing";

  // Ambiguous or both: use geometry. Shoe product shots are often wider; apparel flat-lays often taller or squarer.
  if (ratio >= 1.25) return "shoes";
  if (ratio <= 0.92) return "clothing";

  // Near-square: slight bias to clothing (try fast model first when we fall back).
  return "clothing";
}

/** Server-side: dimensions from raw bytes + filename (authoritative for API routing). */
export function detectGarmentKindFromImageBytes(fileName: string, buffer: ArrayBuffer): GarmentKind {
  const dims = getImageDimensionsFromBytes(buffer);
  if (dims) {
    return detectGarmentKind({
      fileName,
      width: dims.width,
      height: dims.height,
    });
  }
  if (looksLikeShoesByName(fileName) && !looksLikeClothingByName(fileName)) return "shoes";
  if (looksLikeClothingByName(fileName) && !looksLikeShoesByName(fileName)) return "clothing";
  return "clothing";
}
