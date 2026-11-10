import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listMessages from "../actions/list-messages.ts";

export default pollFromListAction<{ channelId: string }>({
  key: "new-message",
  title: "New Message",
  description: "The run gets each newly posted channel message.",
  action: listMessages as unknown as ActionDefinition,
  input: (params) => ({
    channelId: params.channelId,
    limit: 100,
  }),
  params: [{ key: "channelId", label: "Channel ID", type: "string", required: true }],
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "content", type: "string", label: "Message content" },
  ],
  sample: { id: "123456789012345678", content: "Hello, workflow." },
  maxPages: 1,
});
