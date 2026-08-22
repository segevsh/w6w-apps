import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient } from "../lib/client.ts";

/**
 * `com.atproto.repo.uploadBlob` — put bytes in the repository so a post can
 * embed them.
 *
 * ## A blob is not attached to anything until a record references it
 *
 * Uploading returns a **blob reference**, and that is all it does. The bytes sit
 * in the repository unreferenced, and an unreferenced blob is garbage-collected
 * after a while. The reference has to go into a record — an
 * `app.bsky.embed.images` embed on a post — for the image to exist anywhere a
 * person can see it.
 *
 * So the sequence is: upload, take the `blob`, build the embed, post. Uploading
 * and then not posting leaves nothing behind, which is the correct behaviour
 * and surprises people who expect a media library.
 *
 * ## Alt text is a separate field, and it is on the embed
 *
 * Nothing about the upload carries alt text; it belongs on the embed's image
 * entry. This action returns a ready-made embed fragment with the alt text
 * filled in, because assembling that by hand is where it gets forgotten.
 *
 * ## The size limit is a hard 1,000,000 bytes
 *
 * Roughly a megabyte, and it is bytes of the encoded file rather than pixels.
 * Over it, the PDS answers `BlobTooLarge`. Resizing is the caller's job — this
 * refuses early with the actual number rather than sending a doomed upload.
 */
const MAX_BLOB_BYTES = 1_000_000;

const action: ActionDefinition = {
  key: "blob-upload",
  type: "perform",
  resource: "blob",
  title: "Upload an image",
  description:
    "Upload bytes and get a blob reference. Nothing is visible until a post EMBEDS the " +
    "reference — an unreferenced blob is collected as garbage.",
  idempotent: false,
  params: [
    {
      key: "data",
      label: "Data",
      type: "string",
      required: true,
      default: "",
      hint: "Base64-encoded file bytes, with or without a `data:` prefix.",
    },
    {
      key: "mimeType",
      label: "Type",
      type: "string",
      default: "image/jpeg",
      hint: "`image/jpeg`, `image/png`, `image/webp`, `image/gif`. Taken from a `data:` prefix " +
        "when there is one.",
    },
    {
      key: "alt",
      label: "Alt Text",
      type: "text",
      default: "",
      hint: "Describes the image for screen readers. Goes on the EMBED, not the upload — the " +
        "ready-made embed this returns has it filled in.",
    },
  ],
  output: [
    { key: "blob", type: "object", label: "The blob reference, for an embed" },
    { key: "embed", type: "object", label: "A ready-made single-image embed for `post-create`" },
    { key: "size", type: "number", label: "Bytes uploaded" },
    { key: "mimeType", type: "string", label: "What it was uploaded as" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.data ?? "").trim();
    if (!raw) throw new Error("`data` is required");

    // A `data:` URL carries its own type, and pasting one whole is common.
    const dataUrl = /^data:([^;,]+)(?:;[^,]*)?,(.*)$/s.exec(raw);
    const base64 = (dataUrl ? dataUrl[2] : raw).replace(/\s+/g, "");
    const mimeType = dataUrl?.[1] ?? String(p.mimeType ?? "image/jpeg");

    let bytes: Uint8Array;
    try {
      const binary = atob(base64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      throw new Error("`data` is not valid base64");
    }
    if (bytes.length === 0) throw new Error("`data` decoded to zero bytes");
    if (bytes.length > MAX_BLOB_BYTES) {
      throw new Error(
        `the file is ${bytes.length} bytes and the PDS limit is ${MAX_BLOB_BYTES}. Resize or ` +
          "re-encode it before uploading — the limit is on the encoded bytes, not the dimensions",
      );
    }

    const result = await new BlueskyClient(ctx).call<{ blob?: Record<string, unknown> }>(
      "com.atproto.repo.uploadBlob",
      { method: "POST", raw: { bytes, contentType: mimeType } },
    );
    if (!result?.blob) throw new Error("the PDS did not return a blob reference");

    ctx.log("info", "uploaded a Bluesky blob", { size: bytes.length, mimeType });

    return {
      blob: result.blob,
      // Assembled here because this is where alt text gets forgotten.
      embed: {
        $type: "app.bsky.embed.images",
        images: [{ image: result.blob, alt: String(p.alt ?? "") }],
      },
      size: bytes.length,
      mimeType,
    };
  },
};

export default action;
