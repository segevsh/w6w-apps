import type { ActionDefinition } from "@w6w/types";
import { compact, MuxClient, PLAYBACK_POLICIES } from "../lib/client.ts";
import { PASSTHROUGH_PARAM } from "../lib/params.ts";

/**
 * `POST /video/v1/assets` — ingest a video from a URL.
 *
 * ## This is the one video API a sandbox can actually use
 *
 * Mux takes an **input URL** and fetches the file itself, rather than requiring
 * the bytes in the request. That is what makes video ingestion possible from a
 * workflow at all: a sandbox with no local file can still hand Mux a signed S3
 * link, a recording URL from another service, or anything else publicly
 * reachable, and Mux does the transfer between two datacentres.
 *
 * (`upload-create` is the other route, for when a *person* is uploading from
 * their browser.)
 *
 * ## Creating an asset is asynchronous, and `ready` is not immediate
 *
 * The response comes back with `status: "preparing"`. The video cannot be
 * played until it becomes `ready`, which for a long file is minutes — and it
 * can become `errored` instead, most often because the input URL was not
 * reachable or was not a video Mux could decode.
 *
 * So a workflow that creates an asset and immediately hands the playback URL to
 * somebody is publishing a video that does not play yet. The honest sequence is
 * to wait for the `video.asset.ready` webhook, or poll `asset-get`.
 *
 * ## `passthrough` is the join key
 *
 * Whatever goes in it comes back on the asset, on every webhook about it, and
 * in Mux Data's views. It is the difference between correlating a webhook to
 * your own record instantly and keeping a separate map of Mux ids.
 */
const action: ActionDefinition = {
  key: "asset-create",
  type: "perform",
  resource: "asset",
  title: "Create asset from a URL",
  description:
    "Ingest a video by giving Mux a URL to fetch — which is what makes this usable from a " +
    "workflow. The asset arrives `preparing` and cannot be played until it is `ready`.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Input URL",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://example.com/video.mp4",
      hint: "Publicly reachable, or a signed URL. Mux fetches it — the bytes never pass through " +
        "this workflow.",
    },
    {
      key: "playbackPolicy",
      label: "Playback Policy",
      type: "select",
      default: "public",
      options: PLAYBACK_POLICIES,
      hint: "⚠️ `signed` needs viewers to present a JWT signed with your private key, which " +
        "this app cannot mint — the asset would exist and be unplayable from here.",
    },
    {
      key: "videoQuality",
      label: "Video Quality",
      type: "select",
      default: "plus",
      options: [
        { value: "basic", label: "Basic — cheapest, single rendition" },
        { value: "plus", label: "Plus — adaptive bitrate" },
        { value: "premium", label: "Premium" },
      ],
      hint: "Decides encoding cost and what resolutions viewers can get. Not changeable later.",
    },
    PASSTHROUGH_PARAM,
    {
      key: "mp4Support",
      label: "MP4 Support",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "None — HLS only" },
        { value: "standard", label: "Standard — an MP4 for download" },
        { value: "capped-1080p", label: "Capped 1080p" },
      ],
      hint: "Adds a downloadable MP4 beside the stream. Needed for anything that cannot play " +
        "HLS, and it costs extra storage.",
    },
    {
      key: "normalizeAudio",
      label: "Normalise Audio",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Levels the loudness — worth it for user-generated or multi-source content.",
    },
    {
      key: "generateSubtitles",
      label: "Generate Subtitles",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Mux transcribes the audio. Adds processing time and cost.",
    },
    {
      key: "inputs",
      label: "Advanced Inputs",
      type: "json",
      default: "",
      advanced: true,
      hint: "Mux's full `input` array, for overlays, extra audio tracks or side-loaded " +
        "subtitles. Overrides Input URL.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Asset" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const explicitInputs = p.inputs === undefined || p.inputs === ""
      ? undefined
      : (JSON.parse(String(p.inputs)) as unknown[]);
    const url = String(p.url ?? "").trim();
    if (!explicitInputs && !url) {
      throw new Error("`url` is required (or give the full `inputs` array)");
    }

    const policy = String(p.playbackPolicy ?? "public");
    if (policy === "signed") {
      ctx.log(
        "warn",
        "a signed playback policy needs a JWT this app cannot mint — the asset will exist but " +
          "will not be playable from a URL built here",
        {},
      );
    }

    const subtitles = p.generateSubtitles === true
      ? [{ generated_subtitles: [{ language_code: "en", name: "English (auto)" }] }]
      : undefined;

    ctx.log("info", "creating a Mux asset from a URL", { policy });
    return await new MuxClient(ctx).request("/video/v1/assets", {
      method: "POST",
      body: compact({
        input: explicitInputs ?? [
          compact({ url, ...(subtitles ? subtitles[0] : {}) }),
        ],
        playback_policies: [policy],
        video_quality: String(p.videoQuality ?? "plus"),
        passthrough: p.passthrough,
        mp4_support: String(p.mp4Support ?? "") || undefined,
        normalize_audio: p.normalizeAudio === true ? true : undefined,
      }),
    });
  },
};

export default action;
