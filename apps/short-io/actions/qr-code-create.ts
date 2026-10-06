import type { ActionDefinition } from "@w6w/types";
import { compact, ShortClient } from "../lib/client.ts";

interface Input {
  linkId: string;
  useDomainSettings?: boolean;
  type?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

/**
 * POST /links/qr/{linkIdString} with `accept: application/json`.
 *
 * Without that header the vendor answers with the image bytes, which a workflow
 * cannot carry; the operation's own header description says to send
 * `application/json` "to receive a hosted URL". The response schema is NOT
 * documented (`Default Response` only), so it is returned untouched under
 * `result` rather than claiming fields. `useDomainSettings` is the one required
 * body field.
 */
const qrCodeCreate: ActionDefinition<Input, { result: unknown }> = {
  key: "qr-code-create",
  type: "perform",
  resource: "qr-code",
  title: "Create QR Code",
  description: "Generate a QR code for a link and return Short.io's JSON answer (a hosted URL).",
  idempotent: false,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      placeholder: "lnk_abc123_def456",
    },
    {
      key: "useDomainSettings",
      label: "Use domain QR settings",
      type: "boolean",
      default: true,
      hint: "Apply the domain's saved QR styling instead of the options below.",
    },
    {
      key: "type",
      label: "Format",
      type: "select",
      options: [{ value: "png", label: "PNG" }, { value: "svg", label: "SVG" }],
    },
    { key: "size", label: "Size scale (1-99)", type: "number", validation: { min: 1, max: 99 } },
    { key: "color", label: "Color", type: "string", placeholder: "#000000" },
    { key: "backgroundColor", label: "Background color", type: "string", placeholder: "#FFFFFF" },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (shape not documented)" }],

  async execute(input, ctx) {
    const { linkId, useDomainSettings, ...style } = input;
    const result = await new ShortClient(ctx).request<unknown>(
      `/links/qr/${encodeURIComponent(linkId)}`,
      {
        method: "POST",
        headers: { accept: "application/json" },
        body: { useDomainSettings: useDomainSettings ?? true, ...compact(style) },
      },
    );
    return { result };
  },
};

export default qrCodeCreate;
