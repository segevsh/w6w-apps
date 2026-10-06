import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  channelUuid: string;
}

const channelStatusGet: ActionDefinition<Input> = {
  key: "channel-status-get",
  type: "read",
  resource: "channel",
  title: "Get Channel Status",
  description: "Get a connected number's connection status and its last 10 events (GET " +
    "/whatsapp/channel/{channel-uuid}/status). 2Chat refreshes this about every 3 seconds. " +
    "connection_status: C connected, D disconnected, F failure.",
  params: [
    {
      key: "channelUuid",
      label: "Channel UUID",
      type: "string",
      required: true,
      hint: "Starts with WPN. From List WhatsApp Numbers.",
    },
  ],
  output: [
    { key: "connection_status", type: "string", label: "C, D or F" },
    { key: "qr_code", type: "string", label: "QR value, present only when awaiting a scan" },
    { key: "events", type: "array", label: "Last 10 events" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/whatsapp/channel/${seg(input.channelUuid)}/status`);
  },
};

export default channelStatusGet;
