import type { ActionDefinition } from "@w6w/types";
import { compact, MuxClient, PLAYBACK_POLICIES } from "../lib/client.ts";
import { PASSTHROUGH_PARAM } from "../lib/params.ts";

/**
 * `POST /video/v1/uploads` — a URL a browser can PUT a file to.
 *
 * The other half of ingestion. `asset-create` is right when the video already
 * lives somewhere Mux can fetch; this is right when a **person** is uploading
 * from their device, and it is the only route that does not require the file to
 * be reachable from the internet first.
 *
 * The response's `url` is a signed, single-use destination that a browser can
 * `PUT` to directly — the bytes never touch this workflow or its server, which
 * is the point.
 *
 * ## `cors_origin` is what makes it work in a browser
 *
 * Without the origin that will do the upload, the browser's preflight fails and
 * the upload never starts. It is the commonest reason a direct upload works in
 * a terminal and not on a page.
 *
 * ## It becomes an asset, later
 *
 * The upload and the asset are separate objects: the upload completes, and Mux
 * *then* creates an asset from it. The upload's `asset_id` appears once that
 * has happened, and the asset still has to become `ready` after that. A
 * workflow watching for a finished video is watching two transitions, not one.
 */
const action: ActionDefinition = {
  key: "upload-create",
  type: "perform",
  resource: "upload",
  title: "Create a direct upload URL",
  description:
    "Mint a single-use URL a browser can PUT a file to — the bytes never pass through this " +
    "workflow. The asset appears afterwards, and is `ready` later still.",
  idempotent: false,
  params: [
    {
      key: "corsOrigin",
      label: "CORS Origin",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://app.example.com",
      hint: "The origin of the page doing the upload. Without it the browser's preflight fails " +
        "— the commonest reason a direct upload works in a terminal and not on a page.",
    },
    {
      key: "playbackPolicy",
      label: "Playback Policy",
      type: "select",
      default: "public",
      options: PLAYBACK_POLICIES,
    },
    {
      key: "videoQuality",
      label: "Video Quality",
      type: "select",
      default: "plus",
      options: [
        { value: "basic", label: "Basic" },
        { value: "plus", label: "Plus" },
        { value: "premium", label: "Premium" },
      ],
    },
    PASSTHROUGH_PARAM,
    {
      key: "timeout",
      label: "Valid For (seconds)",
      type: "number",
      default: 3600,
      advanced: true,
      hint: "How long the upload URL stays usable. Mux's maximum is 604800 (a week).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Upload (including its `url`)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const corsOrigin = String(p.corsOrigin ?? "").trim();
    if (!corsOrigin) {
      throw new Error(
        "`corsOrigin` is required — without it the browser's preflight fails and the upload " +
          "never starts",
      );
    }
    const timeout = Number(p.timeout ?? 3600);

    return await new MuxClient(ctx).request("/video/v1/uploads", {
      method: "POST",
      body: compact({
        cors_origin: corsOrigin,
        timeout: Number.isFinite(timeout) && timeout > 0 ? Math.min(604800, timeout) : undefined,
        new_asset_settings: compact({
          playback_policies: [String(p.playbackPolicy ?? "public")],
          video_quality: String(p.videoQuality ?? "plus"),
          passthrough: p.passthrough,
        }),
      }),
    });
  },
};

export default action;
