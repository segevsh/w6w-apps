import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

interface Input {
  tag: string;
}

const getTagInfo: ActionDefinition<Input> = {
  key: "get-tag-info",
  type: "read",
  resource: "tag",
  title: "Get Tag Info",
  description:
    "Return detailed stats for a single tag, including recent-period aggregates (POST /tags/info.json).",
  params: [
    { key: "tag", label: "Tag", type: "string", required: true },
  ],
  output: [
    { key: "tag", type: "string", label: "Tag" },
    { key: "sent", type: "number", label: "Sent" },
    { key: "hard_bounces", type: "number", label: "Hard Bounces" },
    { key: "soft_bounces", type: "number", label: "Soft Bounces" },
    { key: "rejects", type: "number", label: "Rejects" },
    { key: "complaints", type: "number", label: "Complaints" },
    { key: "unsubs", type: "number", label: "Unsubscribes" },
    { key: "opens", type: "number", label: "Opens" },
    { key: "clicks", type: "number", label: "Clicks" },
  ],

  execute(input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/tags/info.json", { tag: input.tag });
  },
};

export default getTagInfo;
