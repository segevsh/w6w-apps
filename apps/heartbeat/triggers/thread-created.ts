import type { Param } from "@w6w/types";
import { requireParam, webhookTrigger } from "../lib/triggers.ts";

const CHANNEL: Param = {
  key: "channelId",
  label: "Channel ID",
  type: "string",
  required: true,
  hint: "The channel to watch for new threads (Get Channels lists the ids).",
};

/** A thread is created in a channel (action `THREAD_CREATE`, filter `channelID`). */
const threadCreated = webhookTrigger({
  key: "thread-created",
  title: "New Thread",
  description:
    "Fires when a new thread is created in the chosen channel (action THREAD_CREATE). The run gets the thread id and the channel id.",
  action: "THREAD_CREATE",
  params: [CHANNEL],
  filter: (p) => ({ channelID: requireParam(p, "channelId", "channel ID") }),
  output: [
    { key: "id", type: "string", label: "Thread ID" },
    { key: "channelID", type: "string", label: "Channel ID" },
  ],
  sample: {
    action: "THREAD_CREATE",
    id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    channelID: "9e455d01-82d8-41a4-a176-fa4d9462e08b",
  },
});

export default threadCreated;
