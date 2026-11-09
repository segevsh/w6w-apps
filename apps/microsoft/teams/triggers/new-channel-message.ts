import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listChannelMessages from "../actions/list-channel-messages.ts";

interface Params {
  teamId: string;
  channelId: string;
}

export default pollFromListAction<Params>({
  key: "new-channel-message",
  title: "New Channel Message",
  description: "Fires for newly listed root messages in a Teams channel.",
  action: listChannelMessages as unknown as ActionDefinition,
  // Graph does not accept $orderby on this endpoint; it returns the latest
  // modified conversation first, as documented by List channel messages.
  input: ({ teamId, channelId }) => ({ teamId, channelId, top: 50, all: false }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "body.content", type: "string", label: "Message" },
  ],
  sample: {
    id: "1731153600000",
    createdDateTime: "2026-11-09T12:00:00Z",
    body: { content: "Hello team" },
  },
  maxPages: 1,
  minIntervalMs: 86_400_000,
});
