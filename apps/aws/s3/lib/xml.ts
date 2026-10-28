/**
 * Minimal, dependency-free XML text extraction for S3's REST responses.
 *
 * S3 speaks XML, not JSON, for every response body this app parses
 * (`ListAllMyBucketsResult`, `ListBucketResult`, `CopyObjectResult`, `Error`).
 * Rather than add an XML parsing dependency (the app contract allows only
 * `@w6w/types` as a runtime dependency), this extracts exactly the flat,
 * known-shape fields each action declares in its `output` — it is not a
 * general-purpose XML parser and does not handle attributes, mixed content,
 * or CDATA beyond what S3 actually emits for these operations.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

/** First occurrence of `<tag>...</tag>` (or self-closing `<tag/>`), decoded. Undefined if absent. */
export function xmlText(xml: string, tag: string): string | undefined {
  const selfClosing = new RegExp(`<${tag}\\s*/>`);
  if (selfClosing.test(xml)) return "";
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXmlEntities(match[1]).trim() : undefined;
}

/** Every top-level `<tag>...</tag>` block's raw inner content (not yet decoded — pass to `xmlText` again for sub-fields). */
export function xmlBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/** `<Error><Code>..</Code><Message>..</Message></Error>` — S3's uniform error body. */
export function xmlError(xml: string): { code?: string; message?: string } | undefined {
  if (!xml.includes("<Error>")) return undefined;
  const body = xmlBlocks(xml, "Error")[0];
  if (body === undefined) return undefined;
  return { code: xmlText(body, "Code"), message: xmlText(body, "Message") };
}
