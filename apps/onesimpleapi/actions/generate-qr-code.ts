import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  message: string;
  size?: "Small" | "Medium" | "Large";
  format?: "svg";
  color?: string;
  background?: string;
}

interface Output {
  url?: string;
  elapsed?: number;
  [key: string]: unknown;
}

/**
 * GET /api/qr_code — generate a QR code image (PNG by default, or SVG) for a
 * link, phone number, or arbitrary text.
 *
 * Output field `url` is inferred from the vendor's documented CSV columns
 * ("URL, Elapsed") — see `take-screenshot.ts` for why that inference is
 * grounded rather than guessed.
 */
const generateQrCode: ActionDefinition<Input, Output> = {
  key: "generate-qr-code",
  type: "perform",
  resource: "utility",
  title: "Generate QR Code",
  description: "Create a QR code image from a link, phone number, or text.",
  // Encoding is a pure function of `message` + the format/style options: the
  // same inputs always produce the same code, so a retry is always safe.
  idempotent: true,
  params: [
    {
      key: "message",
      label: "Content",
      type: "string",
      required: true,
      hint: "A link, phone number, or plain text to encode.",
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      default: "Small",
      options: [
        { value: "Small", label: "Small" },
        { value: "Medium", label: "Medium" },
        { value: "Large", label: "Large" },
      ],
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      hint: "Defaults to PNG.",
      options: [{ value: "svg", label: "SVG" }],
    },
    {
      key: "color",
      label: "Foreground color",
      type: "string",
      hint: "Hex (#ffccdd), rgb(...), or rgba(...).",
    },
    {
      key: "background",
      label: "Background color",
      type: "string",
      hint: "Hex (#ffccdd), rgb(...), or rgba(...).",
    },
  ],
  output: [{ key: "url", type: "string", label: "QR code image URL" }],

  execute(input, ctx) {
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/qr_code", {
      query: {
        message: input.message,
        size: input.size,
        format: input.format,
        color: input.color,
        background: input.background,
      },
    });
  },
};

export default generateQrCode;
