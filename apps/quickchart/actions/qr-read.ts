import type { ActionDefinition } from "@w6w/types";
import { compact, QuickChartClient } from "../lib/client.ts";

interface Input {
  url?: string;
  image?: string;
}

/**
 * `POST /qr-read` — decodes a QR code from a public image URL or raw base64.
 *
 * "No QR code in the image" is HTTP **500** (`{error: "No QR code was found in that image."}`),
 * not 4xx. It is an expected outcome for a reader, so 500 is accepted and reported as
 * `found: false` when the body carries that message; any other 500 still throws.
 */
const qrRead: ActionDefinition<Input> = {
  key: "qr-read",
  type: "read",
  resource: "qr",
  title: "Read QR Code",
  description: "Decode the text of a QR code in an image.",
  requiresAuth: false,
  params: [
    {
      key: "url",
      label: "Image URL",
      type: "string",
      hint: "A publicly reachable image. Takes precedence over Base64 image.",
    },
    {
      key: "image",
      label: "Base64 image",
      type: "text",
      hint: "Raw base64 of the image, with no data: URI prefix.",
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "QR code found" },
    { key: "text", type: "string", label: "Decoded text" },
  ],

  async execute(input, ctx) {
    if (!input.url && !input.image) throw new Error("Provide an image URL or a base64 image");
    const res = await new QuickChartClient(ctx).send(
      "POST",
      "/qr-read",
      compact({ url: input.url, image: input.image }),
      { accept: [500] },
    );
    const body = await res.json().catch(() => ({})) as { result?: string; error?: string };
    if (res.ok) return { found: true, text: body.result ?? "" };
    if (/no qr code/i.test(body.error ?? "")) return { found: false, text: null };
    throw new Error(`QuickChart 500 for POST /qr-read: ${body.error ?? "no message"}`);
  },
};

export default qrRead;
