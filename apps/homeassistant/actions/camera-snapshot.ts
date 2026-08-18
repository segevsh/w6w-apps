import type { ActionDefinition } from "@w6w/types";
import { entityId, urlFromConnection } from "../lib/client.ts";

/**
 * `GET /api/camera_proxy/<entity_id>` — a still from a camera.
 *
 * ## It returns image bytes, not JSON
 *
 * Every other endpoint in this API answers with JSON. This one answers with a
 * JPEG or PNG body, so it is fetched directly rather than through the client,
 * and encoded to base64 for a workflow to carry.
 *
 * ## Size is the thing to watch
 *
 * A 4K camera's still is several megabytes, and base64 adds a third on top. A
 * workflow that snapshots on every motion event and keeps the results will
 * carry a great deal of data very quickly, so this reports the byte count and
 * refuses beyond a ceiling rather than quietly producing an enormous value.
 *
 * ## It is a still, not a stream
 *
 * The proxy returns the most recent frame the integration has. For a camera
 * that only updates on motion, that frame may be minutes old, and nothing in
 * the response says when it was taken — the entity's `last_changed` is the
 * closest available signal.
 */
const MAX_BYTES = 8_000_000;

const action: ActionDefinition = {
  key: "camera-snapshot",
  type: "read",
  resource: "camera",
  title: "Take a camera snapshot",
  description:
    "The latest still from a camera, as base64. This may be an old frame — the proxy returns " +
    "whatever the integration last received, and nothing says when.",
  params: [
    {
      key: "entityId",
      label: "Camera",
      type: "string",
      required: true,
      default: "",
      placeholder: "camera.front_door",
      hint: "A `camera.*` entity id.",
    },
  ],
  output: [
    { key: "data", type: "string", label: "Base64-encoded image bytes" },
    { key: "dataUrl", type: "string", label: "The same as a data: URL" },
    { key: "contentType", type: "string", label: "image/jpeg or image/png" },
    { key: "size", type: "number", label: "Bytes before encoding" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entity = entityId(p.entityId, "entityId");
    if (!entity.startsWith("camera.")) {
      throw new Error(`\`entityId\` must be a camera entity — got \`${entity}\``);
    }

    const base = urlFromConnection(ctx.connection);
    const res = await ctx.fetch(
      `${base}/api/camera_proxy/${encodeURIComponent(entity)}`,
      { headers: { accept: "image/*" } },
    );
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(
        `Home Assistant ${res.status} for the camera proxy — a 404 here usually means the camera ` +
          "entity exists but its integration has no image right now",
      );
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      throw new Error(
        `the snapshot is ${buffer.length} bytes, over the ${MAX_BYTES} ceiling this action ` +
          "applies. Base64 adds a third again on top, and carrying that through a workflow is " +
          "rarely what anybody wants",
      );
    }

    let binary = "";
    for (const byte of buffer) binary += String.fromCharCode(byte);
    const data = btoa(binary);

    ctx.log("info", "took a Home Assistant camera snapshot", {
      size: buffer.length,
      contentType,
    });

    return {
      data,
      dataUrl: `data:${contentType};base64,${data}`,
      contentType,
      size: buffer.length,
    };
  },
};

export default action;
