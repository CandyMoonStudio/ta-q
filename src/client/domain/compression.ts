// Lightweight Base64 compression logic extracted from checklist.js

export function compressData(data: any): string | null {
  try {
    const json = JSON.stringify(data);
    // Simple compression: Base64 encode
    return btoa(unescape(encodeURIComponent(json)));
  } catch (e) {
    console.error('Compression failed:', e);
    return null;
  }
}

export function decompressData(compressed: string): any {
  try {
    const json = decodeURIComponent(escape(atob(compressed)));
    return JSON.parse(json);
  } catch (e) {
    console.error('Decompression failed:', e);
    return null;
  }
}
