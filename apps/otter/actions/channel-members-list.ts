import type { ActionDefinition } from "@w6w/types";
import { OtterClient, type OtterMeta, type OtterUser } from "../lib/client.ts";

interface Input {
  channelId: string;
}

interface Output {
  meta: OtterMeta;
  data: OtterUser[];
}

const channelMembersList: ActionDefinition<Input, Output> = {
  key: "channel-members-list",
  type: "read",
  resource: "channel",
  title: "List Channel Members",
  description: "List all members of a channel, in alphabetical order by member name.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],
  output: [
    { key: "meta.retrieved_at", type: "string", label: "Retrieved at" },
    { key: "data", type: "array", label: "Members" },
  ],

  execute(input, ctx) {
    return new OtterClient(ctx).get<Output>(
      `/channels/${encodeURIComponent(input.channelId)}/members`,
    );
  },
};

export default channelMembersList;
