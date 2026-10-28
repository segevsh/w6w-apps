/**
 * A small XML reader, because Azure Blob Storage does not speak JSON.
 *
 * Every other app in this pack parses JSON. This one cannot: the Blob service
 * answers `List Containers`, `List Blobs` and every other read with XML, and
 * there is no `Accept: application/json` that changes it. The sandbox has no
 * DOMParser and no imports, so the parsing lives here.
 *
 * ## Why a purpose-built reader rather than a general parser
 *
 * A general XML parser has to take a position on namespaces, entities,
 * CDATA, mixed content and attribute-versus-element ambiguity. Azure's blob
 * responses use none of that: they are element-only trees of text leaves, with
 * no attributes that matter and no namespaces on the elements this app reads.
 * So this handles exactly that shape and refuses the rest, which is a much
 * smaller thing to get right than a parser that would be wrong in subtler ways.
 *
 * **It is not a general XML parser and must not be used as one.** In
 * particular it does not resolve external entities — the class of bug that
 * makes XML parsing dangerous — because it does not resolve entities at all
 * beyond the five predefined ones.
 *
 * ## Everything is a string
 *
 * XML has no types. `<Content-Length>1024</Content-Length>` is the text
 * `"1024"`, and `<Deleted>true</Deleted>` is the text `"true"`. The actions
 * convert what they need and the raw strings are what come back, so nothing is
 * silently coerced on the way through.
 */

/** A parsed element: its text, and its children by name. */
export interface XmlNode {
  /** Text content, for a leaf. Empty for a branch. */
  text: string;
  /** Children, keyed by tag name. Repeated tags collect into the array. */
  children: Record<string, XmlNode[]>;
}

/** The five entities XML predefines. Nothing else is resolved. */
const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
};

/** Resolve the predefined entities and numeric references, and nothing else. */
export function decodeText(value: string): string {
  return value
    .replace(/&(?:lt|gt|amp|quot|apos);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/**
 * Parse an element-only XML document into a tree.
 *
 * Throws on anything outside that shape rather than guessing, because a
 * response this cannot read is a response the caller should hear about.
 */
export function parseXml(source: string): XmlNode {
  const text = String(source ?? "")
    // The declaration and any BOM — Azure sends both.
    .replace(/^﻿/, "")
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const root: XmlNode = { text: "", children: {} };
  const stack: XmlNode[] = [root];
  // Tags, or the text between them.
  const pattern = /<\s*(\/?)\s*([A-Za-z_][\w.:-]*)([^>]*?)(\/?)\s*>|([^<]+)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const [, closing, name, , selfClosing, chunk] = match;

    if (chunk !== undefined) {
      stack[stack.length - 1].text += decodeText(chunk);
      continue;
    }
    if (closing) {
      if (stack.length === 1) {
        throw new Error(`Azure returned XML this reader cannot parse: unexpected </${name}>`);
      }
      stack.pop();
      continue;
    }

    const node: XmlNode = { text: "", children: {} };
    const parent = stack[stack.length - 1];
    (parent.children[name] ??= []).push(node);
    if (!selfClosing) stack.push(node);
  }

  if (stack.length !== 1) {
    throw new Error("Azure returned XML this reader cannot parse: an element was never closed");
  }
  return root;
}

/** The first child with this name, or undefined. */
export function child(node: XmlNode | undefined, name: string): XmlNode | undefined {
  return node?.children[name]?.[0];
}

/** Every child with this name. Absent means an empty list, not undefined. */
export function children(node: XmlNode | undefined, name: string): XmlNode[] {
  return node?.children[name] ?? [];
}

/**
 * The text of a nested path — `text(root, "EnumerationResults", "NextMarker")`.
 *
 * Returns `undefined` for a missing element and `""` for a present but empty
 * one, because Azure uses the difference: `<NextMarker />` means "no more
 * pages", and its absence means the same thing, but an empty `<Snapshot />`
 * and a missing one are not always alike.
 */
export function text(node: XmlNode | undefined, ...path: string[]): string | undefined {
  let current: XmlNode | undefined = node;
  for (const name of path) {
    current = child(current, name);
    if (!current) return undefined;
  }
  return current?.text;
}

/** Flatten a node's leaf children into a plain object of strings. */
export function toRecord(node: XmlNode | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, nodes] of Object.entries(node?.children ?? {})) {
    const first = nodes[0];
    if (first && Object.keys(first.children).length === 0) out[name] = first.text;
  }
  return out;
}
