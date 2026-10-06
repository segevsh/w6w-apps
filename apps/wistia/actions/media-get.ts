import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { mediaIdParam } from "../lib/params.ts";

interface Input {
  mediaId: string;
  includeSpeakers?: boolean;
}

const mediaGet: ActionDefinition<Input> = {
  key: "media-get",
  type: "read",
  resource: "media",
  title: "Get Media",
  description: "Fetch one media by its hashed ID: name, status, duration, assets and thumbnail.",
  params: [mediaIdParam, { key: "includeSpeakers", label: "Include speakers", type: "boolean" }],
  output: [
    { key: "id", type: "number", label: "Numeric ID" },
    { key: "hashed_id", type: "string", label: "Hashed ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "queued, processing, ready or failed" },
    { key: "duration", type: "number", label: "Duration in seconds" },
    { key: "assets", type: "array", label: "Downloadable assets" },
  ],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/medias/${encodeId(input.mediaId)}`, {
      query: { include: input.includeSpeakers ? "speakers" : undefined },
    });
  },
};

export default mediaGet;
