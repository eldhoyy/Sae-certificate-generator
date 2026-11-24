const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

export function isValidCertificateBackground(bytes: Uint8Array, mime: string): boolean {
  if (bytes.byteLength < 5 || bytes.byteLength > MAX_BACKGROUND_BYTES) return false;

  if (mime === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.byteLength >= signature.length && signature.every((value, index) => bytes[index] === value);
  }

  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mime === "application/pdf") {
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }

  return false;
}
