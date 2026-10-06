import type { ActionDefinition } from "@w6w/types";
import { QuickChartClient } from "../lib/client.ts";
import { QR_PARAMS, qrBody } from "../lib/params.ts";
import type { QrInput } from "../lib/params.ts";

interface ValidateResponse {
  success?: boolean;
  errors?: string[];
  warnings?: string[];
  normalized?: Record<string, unknown>;
}

/**
 * `POST /api/validate-qr` — checks a QR request and answers JSON. Stricter than `/qr`: it rejects
 * a `format` the renderer would silently turn into PNG. As with chart validation, a 400 is the
 * answer (`valid: false`), not an exception.
 */
const qrValidate: ActionDefinition<QrInput> = {
  key: "qr-validate",
  type: "read",
  resource: "qr",
  title: "Validate QR Code",
  description: "Check a QR code request is valid, with errors and warnings as JSON.",
  requiresAuth: false,
  params: [
    ...QR_PARAMS,
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { value: "png", label: "PNG" },
        { value: "svg", label: "SVG" },
        { value: "jpg", label: "JPEG" },
      ],
    },
  ],
  output: [
    { key: "valid", type: "boolean", label: "Valid" },
    { key: "errors", type: "array", label: "Errors" },
    { key: "warnings", type: "array", label: "Warnings" },
    { key: "normalized", type: "object", label: "Normalized request" },
  ],

  async execute(input, ctx) {
    const res = await new QuickChartClient(ctx).json<ValidateResponse>(
      "/api/validate-qr",
      qrBody(input),
      { accept: [400] },
    );
    return {
      valid: res.success === true,
      errors: res.errors ?? [],
      warnings: res.warnings ?? [],
      normalized: res.normalized ?? {},
    };
  },
};

export default qrValidate;
