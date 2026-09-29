import type { ActionDefinition } from "@w6w/types";
import { type OtterChannel, OtterClient, type OtterMeta } from "../lib/client.ts";

interface Output {
  meta: OtterMeta;
  data: OtterChannel[];
}

const channelList: ActionDefinition<Record<string, never>, Output> = {
  key: "channel-list",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "List channels for the authenticated user, in alphabetical order by name.",
  params: [],
  output: [
    { key: "meta.retrieved_at", type: "string", label: "Retrieved at" },
    { key: "data", type: "array", label: "Channels" },
  ],

  execute(_input, ctx) {
    return new OtterClient(ctx).get<Output>("/channels");
  },
};

export default channelList;
