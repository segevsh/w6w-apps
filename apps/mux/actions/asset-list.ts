import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /video/v1/assets` — the account's assets, newest first.
 *
 * Worth knowing what this is not: there is no search. Mux filters by
 * `live_stream_id` and by `upload_id` and nothing else — no title, no tag, no
 * passthrough. An account with thousands of assets is paged through, not
 * queried.
 *
 * That is the practical argument for `passthrough`: if a workflow needs to find
 * "the asset for order 4417", the answer has to be a lookup in its own records,
 * because Mux will not do it.
 */
const action: ActionDefinition = {
  key: "asset-list",
  type: "read",
  resource: "asset",
  title: "List assets",
  description:
    "The account's assets, newest first. There is no search — Mux filters only by live stream " +
    "or upload, so finding a specific asset is your own index's job.",
  params: [
    {
      key: "liveStreamId",
      label: "From Live Stream",
      type: "string",
      default: "",
      hint: "Only the recordings of one live stream.",
    },
    {
      key: "uploadId",
      label: "From Upload",
      type: "string",
      default: "",
      advanced: true,
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "assets", type: "array", label: "Assets" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const assets = await new MuxClient(ctx).requestAll("/video/v1/assets", {
      query: {
        live_stream_id: String(p.liveStreamId ?? "") || undefined,
        upload_id: String(p.uploadId ?? "") || undefined,
      },
    }, returnAll ? Infinity : limit);
    return { assets };
  },
};

export default action;
