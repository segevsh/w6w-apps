import type { ActionDefinition } from "@w6w/types";
import channelList from "../actions/channel-list.ts";
import { collectionSnapshot } from "../lib/triggers.ts";

export default collectionSnapshot({
  key: "new-channel",
  title: "New Channel",
  description: "The run gets each new channel in the Twist workspace you choose.",
  action: channelList as unknown as ActionDefinition,
  params: [channelList.params![0]],
  input: (params) => ({ workspaceId: params.workspaceId }),
  output: [{ key: "id", type: "number", label: "Channel ID" }],
  sample: { id: 101, name: "Engineering" },
});
