/**
 * Normalizes input string for comparison or processing.
 * - Trims whitespace
 * - Collapses multiple spaces into one
 * - Converts to lowercase
 * - Converts full-width alphanumeric characters to half-width
 */
export function normalize(str: string | null | undefined): string {
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
