import type { ActionDefinition } from "@w6w/types";
import { MastodonClient } from "../lib/client.ts";

/**
 * `POST /api/v2/media` — upload an attachment.
 *
 * ## v2 is asynchronous, and a 202 means "not yet"
 *
 * v1 blocked until processing finished; v2 returns **202 Accepted** with the
 * attachment's id while the server is still transcoding. Attaching an id that
 * is still processing to a status fails, so the sequence is: upload, wait for
 * the attachment to report a `url`, then post.
 *
 * A small image usually returns 200 and is ready immediately. A video returns
 * 202 and may take a while. This action reports `processing`, so a workflow can
 * tell which happened rather than assuming.
 *
 * ## Alt text is not optional in practice
 *
 * Many instances' rules require a description on media, and some moderators
 * enforce it. It is also simply how the post reaches people using a screen
 * reader. `description` is here as a first-class parameter rather than buried,
 * and its absence is warned about.
 *
 * ## The accepted types and size are the instance's
 *
 * `/api/v2/instance` reports `configuration.media_attachments` with the
 * supported MIME types and size limits, and they differ from server to server.
 * An upload refused here may be fine elsewhere.
 */
const action: ActionDefinition = {
  key: "media-upload",
  type: "perform",
  resource: "media",
  title: "Upload media",
  description:
    "Upload an image or video for a post. v2 is ASYNCHRONOUS — a 202 means the server is still " +
    "processing, and attaching it before it is ready fails.",
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
      hint: "Taken from a `data:` prefix when there is one. The accepted list is the instance's " +
        "own.",
    },
    {
      key: "description",
      label: "Alt Text",
      type: "text",
      default: "",
      hint: "Describes the image for screen readers. Many instances' rules require it, and some " +
        "moderators enforce it.",
    },
    {
      key: "filename",
      label: "Filename",
      type: "string",
      default: "upload",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "The attachment id, for `status-post`" },
    { key: "processing", type: "boolean", label: "Still transcoding — do not attach it yet" },
    { key: "url", type: "string", label: "Its URL, absent while processing" },
    { key: "type", type: "string", label: "image, video, gifv or audio" },
    { key: "size", type: "number", label: "Bytes uploaded" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.data ?? "").trim();
    if (!raw) throw new Error("`data` is required");

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

    const description = String(p.description ?? "").trim();
    if (!description) {
      ctx.log(
        "warn",
        "uploading media with no alt text — many instances' rules require a description",
        { size: bytes.length },
      );
    }

    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes as unknown as BlobPart], { type: mimeType }),
      String(p.filename ?? "upload"),
    );
    if (description) form.append("description", description);

    const attachment = await new MastodonClient(ctx).request<{
      id?: string;
      url?: string | null;
      type?: string;
    }>("/api/v2/media", { method: "POST", form });

    // v2 returns the id before the file is ready; `url` is null until it is.
    const processing = !attachment?.url;
    if (processing) {
      ctx.log("info", "media accepted and still processing — wait before attaching it", {
        id: attachment?.id,
      });
    }

    return {
      id: attachment?.id,
      processing,
      url: attachment?.url ?? undefined,
      type: attachment?.type,
      size: bytes.length,
    };
  },
};

export default action;
