/**
 * TipTap document construction.
 *
 * ## Why a workflow author cannot just type a body
 *
 * Circle's editor is TipTap, and v2 took the opportunity to make that the wire
 * format: "Circle has chosen TipTap as the foundation for its text editor, used
 * across posts, comments, and messages. You will usually find it under
 * `tiptap_body` property inside posts or as the content of a message"
 * (`/get-started/concepts/tiptap-editor`). `POST /posts` accepts `tiptap_body`
 * and nothing else — there is no `body_html` and no `body` on that endpoint's
 * schema. `POST /messages` accepts `rich_text_body`, which is the same document
 * shape with attachment sidecars.
 *
 * So the minimum viable "post some text" is a nested ProseMirror document:
 *
 * ```json
 * { "body": { "type": "doc", "content": [
 *     { "type": "paragraph", "content": [{ "type": "text", "text": "Hello" }] }
 * ] } }
 * ```
 *
 * Making every workflow author hand-write that would be a usability tax and a
 * reliable source of 422s. Making the app accept HTML or Markdown and *render*
 * it would be worse: this module would then be a half-implemented Markdown
 * parser whose bugs look like Circle bugs. So the split is explicit —
 *
 *   - **Body text** (`text`) → this module wraps it, one paragraph per blank
 *     line and a `hardBreak` for every single newline. That covers the common
 *     case exactly and predictably.
 *   - **Body document** (`bodyJson`, advanced) → passed through verbatim for
 *     anything richer: headings, lists, mentions, embeds, polls. The block
 *     vocabulary Circle publishes is `doc`, `paragraph`, `heading`,
 *     `blockquote`, `orderedList`, `bulletList`, `image`, `text`, `hardBreak`,
 *     `mention`, `listItem`, `embed`, `codeBlock`, `horizontalRule`, `file`,
 *     `entity`, `poll`.
 *
 * The two are mutually exclusive and every action that takes a body says so.
 *
 * ## What is deliberately not built here
 *
 * **Mentions and attachments.** A mention needs an `sgid` — a Rails signed
 * global id for the member — and an attachment needs a `signed_id` from
 * `POST /direct_uploads`. Both are opaque tokens minted by Circle for a
 * specific object; neither can be derived from an email address or a URL. A
 * helper that pretended to accept "@alice" would have to invent one. Authors
 * who have a real sgid can put it in `bodyJson`, which is exactly the escape
 * hatch that param exists for.
 *
 * **`circle_ios_fallback_text`.** Circle's own examples repeat the paragraph
 * text into this key on text nodes. It is optional in the schema (only `type`
 * is required on a content node), and guessing at a field whose consumer is the
 * iOS client is not something to do from a doc example, so it is not emitted.
 */

/** A ProseMirror/TipTap node, as loose as Circle's own schema is. */
export interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
  marks?: Array<Record<string, unknown>>;
  attrs?: Record<string, unknown>;
}

/** The `{ body: doc }` envelope both `tiptap_body` and `rich_text_body` use. */
export interface TipTapDocument {
  body: { type: "doc"; content: TipTapNode[] };
}

/**
 * Turn plain text into a TipTap `doc`.
 *
 * Blank lines separate paragraphs; a single newline becomes a `hardBreak`,
 * which is the node Circle documents for exactly this ("Line breaks can be
 * added between any content nodes using `hardBreak` type"). Empty input yields
 * one empty paragraph rather than an empty `content` array — `doc` requires
 * `content`, and a document with zero children is the shape most likely to be
 * rejected.
 */
export function textToTipTap(text: string): TipTapDocument {
  const paragraphs = text.split(/\n[ \t]*\n+/);
  const content: TipTapNode[] = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n");
    const nodes: TipTapNode[] = [];
    lines.forEach((line, i) => {
      if (i > 0) nodes.push({ type: "hardBreak" });
      if (line.length > 0) nodes.push({ type: "text", text: line });
    });
    content.push(nodes.length > 0 ? { type: "paragraph", content: nodes } : { type: "paragraph" });
  }

  if (content.length === 0) content.push({ type: "paragraph" });
  return { body: { type: "doc", content } };
}

/**
 * Resolve the body a caller supplied into the document Circle expects.
 *
 * Accepts either the plain-text form or a raw document, never both, and never
 * neither. `bodyJson` may arrive as an object (a JSON param) or as a string (an
 * expression that produced JSON), and may be given either already wrapped
 * (`{ body: { type: "doc", … } }`) or as the bare `doc` — both are accepted,
 * because the wrapping is an easy thing to get wrong and an unambiguous thing
 * to detect.
 */
export function resolveBody(
  text: string | undefined,
  bodyJson: unknown,
  label = "Body",
): TipTapDocument {
  const hasJson = bodyJson !== undefined && bodyJson !== null && bodyJson !== "";
  const hasText = text !== undefined && text !== "";

  if (hasJson && hasText) {
    throw new Error(`${label}: supply either the text body or the JSON document, not both`);
  }
  if (!hasJson && !hasText) throw new Error(`${label}: a body is required`);
  if (!hasJson) return textToTipTap(text as string);

  let doc: unknown = bodyJson;
  if (typeof doc === "string") {
    try {
      doc = JSON.parse(doc);
    } catch {
      throw new Error(`${label}: JSON document is not valid JSON`);
    }
  }
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new Error(`${label}: JSON document must be an object`);
  }

  const obj = doc as Record<string, unknown>;
  // Already wrapped — trust it, including any extra sidecar keys
  // (`attachments`, `sgids_to_object_map`, …) the author supplied.
  if (obj.body && typeof obj.body === "object") return obj as unknown as TipTapDocument;
  // A bare `doc` node — wrap it.
  if (obj.type === "doc") {
    return { body: obj as unknown as TipTapDocument["body"] };
  }
  throw new Error(
    `${label}: JSON document must be a TipTap doc (\`{"type":"doc","content":[…]}\`) or a ` +
      `wrapped body (\`{"body":{"type":"doc",…}}\`)`,
  );
}
