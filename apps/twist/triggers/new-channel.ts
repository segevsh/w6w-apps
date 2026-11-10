import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import channelList from "../actions/channel-list.ts";

export default pollFromListAction({
  key: "new-channel",
  title: "New Channel",
  description: "The run gets each new channel in the Twist workspace you choose.",
  action: channelList as unknown as ActionDefinition,
  input: (params: { workspaceId?: number }) => ({ workspaceId: params.workspaceId }),
  params: [channelList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Channel ID" }],
  sample: { id: 101, name: "Engineering" },
});
