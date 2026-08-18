import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /video/v1/live-streams` — the account's streams and what each is doing.
 *
 * `status` is the field that matters: `idle` means the stream exists and nobody
 * is broadcasting, `active` means somebody is right now, and `disabled` means it
 * has been turned off. A dashboard or an alert workflow is watching that
 * transition — "we are live" and "we went off air" are both changes in this
 * field.
 *
 * Each entry carries its `stream_key`, which is a credential: a workflow that
 * lists streams and logs the response has logged every broadcaster's key.
 */
const action: ActionDefinition = {
  key: "live-stream-list",
  type: "read",
  resource: "live",
  title: "List live streams",
  description:
    "The account's live streams and whether each is idle, active or disabled. Note the response " +
    "includes stream keys, which are credentials.",
  params: [...LIST_PARAMS],
  output: [
    { key: "streams", type: "array", label: "Live streams" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const streams = await new MuxClient(ctx).requestAll(
      "/video/v1/live-streams",
      {},
      returnAll ? Infinity : limit,
    );
    return { streams };
  },
};

export default action;
