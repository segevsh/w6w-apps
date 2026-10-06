import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  channelUuid: string;
  command: string;
}

const channelCommand: ActionDefinition<Input> = {
  key: "channel-command",
  type: "perform",
  idempotent: true,
  resource: "channel",
  title: "Connect or Disconnect Channel",
  description:
    "Run a command on a connected number: connect brings it online and starts a QR code; disconnect " +
    "takes it offline without deleting it (POST /whatsapp/channel/{channel-uuid}/{command}). A " +
    "connect needs a human to scan the QR with the phone.",
  params: [
    {
      key: "channelUuid",
      label: "Channel UUID",
      type: "string",
      required: true,
    },
    {
      key: "command",
      label: "Command",
      type: "select",
      required: true,
      options: [{ "value": "connect", "label": "Connect" }, {
        "value": "disconnect",
        "label": "Disconnect",
      }],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    if (input.command !== "connect" && input.command !== "disconnect") {
      throw new Error("command must be `connect` or `disconnect`");
    }
    return client.post(`/whatsapp/channel/${seg(input.channelUuid)}/${input.command}`);
  },
};

export default channelCommand;
