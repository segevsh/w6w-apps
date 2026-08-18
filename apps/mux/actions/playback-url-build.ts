import type { ActionDefinition } from "@w6w/types";
import { streamUrl, thumbnailUrl } from "../lib/client.ts";

/**
 * Build the URLs a player and a page need. **This action makes no API call.**
 *
 * A Mux playback URL is not returned by any endpoint — it is assembled from the
 * playback id and a host, and every SDK ships this as a local function:
 *
 *   https://stream.mux.com/{playbackId}.m3u8
 *   https://image.mux.com/{playbackId}/thumbnail.jpg?time=…
 *
 * Doing it here means a workflow can hand a complete set of URLs to an email, a
 * CMS or a webhook response without hard-coding hosts that would then be wrong
 * if they ever changed.
 *
 * The thumbnail's `time` is the interesting parameter: it is seconds into the
 * video, and picking a frame a few seconds in avoids the black first frame that
 * most videos start with — the difference between a poster image and an empty
 * rectangle.
 *
 * ## Signed playback ids are refused
 *
 * They need a JWT signed with the account's private key, and only the auth hook
 * may hold a credential — so this cannot produce a working URL for one, and
 * says so rather than returning a link that 403s at the edge. That is the same
 * call this pack's `cloudinary` app makes about its own signed delivery URLs.
 */
const action: ActionDefinition = {
  key: "playback-url-build",
  type: "read",
  resource: "playback",
  title: "Build playback URLs",
  description:
    "Assemble the HLS and thumbnail URLs from a playback id — locally, with no API call. Only " +
    "for public playback ids; a signed one needs a JWT this app cannot mint.",
  params: [
    {
      key: "playbackId",
      label: "Playback ID",
      type: "string",
      required: true,
      default: "",
      hint: "A PUBLIC playback id. A signed one will not work with these URLs.",
    },
    {
      key: "thumbnailTime",
      label: "Thumbnail Time (seconds)",
      type: "number",
      default: 5,
      hint: "Seconds into the video. A few seconds in avoids the black first frame most videos " +
        "start with.",
    },
    {
      key: "thumbnailWidth",
      label: "Thumbnail Width",
      type: "number",
      default: 0,
      advanced: true,
      hint: "0 leaves it at Mux's default.",
    },
    {
      key: "thumbnailHeight",
      label: "Thumbnail Height",
      type: "number",
      default: 0,
      advanced: true,
    },
    {
      key: "fitMode",
      label: "Fit Mode",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Mux's default" },
        { value: "preserve", label: "Preserve aspect ratio" },
        { value: "crop", label: "Crop" },
        { value: "smartcrop", label: "Smart crop" },
        { value: "pad", label: "Pad" },
      ],
    },
  ],
  output: [
    { key: "streamUrl", type: "string", label: "HLS URL" },
    { key: "thumbnailUrl", type: "string", label: "Thumbnail URL" },
    { key: "playbackId", type: "string", label: "Playback ID" },
  ],

  execute(input, _ctx) {
    const p = input as Record<string, unknown>;
    const playbackId = String(p.playbackId ?? "").trim();
    if (!playbackId) throw new Error("`playbackId` is required");

    const width = Number(p.thumbnailWidth ?? 0);
    const height = Number(p.thumbnailHeight ?? 0);
    const time = Number(p.thumbnailTime ?? 5);

    return {
      playbackId,
      streamUrl: streamUrl(playbackId),
      thumbnailUrl: thumbnailUrl(playbackId, {
        time: Number.isFinite(time) && time >= 0 ? time : undefined,
        width: Number.isFinite(width) && width > 0 ? width : undefined,
        height: Number.isFinite(height) && height > 0 ? height : undefined,
        fitMode: String(p.fitMode ?? "") || undefined,
      }),
    };
  },
};

export default action;
