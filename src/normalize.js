export function normalize(str) {
  if (str == null) {
    return "";
  }

  const trimmed = String(str).trim();
  const collapsed = trimmed.replace(/\s+/g, " ");
  const lowered = collapsed.toLowerCase();

  return lowered.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
    const code = char.charCodeAt(0);
    return String.fromCharCode(code - 0xfee0);
  });
}
