import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  topic: string;
}

const setChannelTopic: ActionDefinition<Input> = {
  key: "set-channel-topic",
  type: "perform",
  resource: "channel",
  title: "Set Channel Topic",
  description: "Set the topic of a public channel (`POST /channels.setTopic`).",
  idempotent: true,
  params: [
    { key: "roomId", label: "Channel ID", type: "string", required: true },
    { key: "topic", label: "Topic", type: "string", required: true },
  ],
  output: [{ key: "topic", type: "string", label: "The topic now set" }],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/channels.setTopic", {
      method: "POST",
      body: { roomId: input.roomId, topic: input.topic },
    });
  },
};

export default setChannelTopic;
