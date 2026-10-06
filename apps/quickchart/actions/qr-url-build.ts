import type { ActionDefinition } from "@w6w/types";
import { QuickChartClient } from "../lib/client.ts";
import { QR_PARAMS, qrBody } from "../lib/params.ts";
import type { QrInput } from "../lib/params.ts";

/**
 * `POST /qr-url` — encodes the parameters into a `https://quickchart.io/qr?...` image URL and
 * answers `{url}`. Nothing is rendered, validated or saved: the QR code exists only when the URL is
 * fetched. A body `key` would be embedded in the URL, so this app never sends one (the connection's
 * key travels in a header, which is why the URL it returns is anonymous).
 */
const qrUrlBuild: ActionDefinition<QrInput> = {
  key: "qr-url-build",
  type: "read",
  resource: "qr",
  title: "Build QR Code URL",
  description: "Get a URL that renders a QR code, without rendering it now.",
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
  output: [{ key: "url", type: "string", label: "QR image URL" }],

  async execute(input, ctx) {
    const res = await new QuickChartClient(ctx).json<{ url?: string }>("/qr-url", qrBody(input));
    if (!res.url) throw new Error("QuickChart /qr-url answered without a url");
    return { url: res.url };
  },
};

export default qrUrlBuild;
