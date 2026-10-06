import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { mediaIdParam } from "../lib/params.ts";

interface Input {
  mediaId: string;
}

const mediaStatsSummaryGet: ActionDefinition<Input> = {
  key: "media-stats-summary-get",
  type: "read",
  resource: "media",
  title: "Get Media Stats Summary",
  description:
    "Aggregated tracking stats for a video embedded on your site: page loads, visitors, play " +
    "click rate, plays and average percent watched. Needs only the media read permission.",
  params: [mediaIdParam],
  output: [
    { key: "hashed_id", type: "string", label: "Hashed ID" },
    {
      key: "stats",
      type: "object",
      label: "pageLoads, visitors, percentOfVisitorsClickingPlay, plays, averagePercentWatched",
    },
  ],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/medias/${encodeId(input.mediaId)}/stats`);
  },
};

export default mediaStatsSummaryGet;
