import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { mediaIdParam } from "../lib/params.ts";

interface Input {
  mediaId: string;
}

const mediaStatsGet: ActionDefinition<Input> = {
  key: "media-stats-get",
  type: "read",
  resource: "media",
  title: "Get Media Stats",
  description:
    "Detailed stats for one video: loads, plays, play rate, hours watched, engagement, " +
    "visitors and call-to-action actions. Needs a token with the Read detailed stats permission.",
  params: [mediaIdParam],
  output: [
    { key: "load_count", type: "number", label: "Loads" },
    { key: "play_count", type: "number", label: "Plays" },
    { key: "play_rate", type: "number", label: "Play rate" },
    { key: "hours_watched", type: "number", label: "Hours watched" },
    { key: "engagement", type: "number", label: "Engagement" },
    { key: "visitors", type: "number", label: "Visitors" },
    { key: "actions", type: "array", label: "Call-to-action actions" },
  ],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/stats/medias/${encodeId(input.mediaId)}`);
  },
};

export default mediaStatsGet;
