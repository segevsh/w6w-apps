import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
  stop_task?: boolean;
}

/** `POST /meeting_events/{uuid}/launch_bot` */
const meetingEventLaunchBot: ActionDefinition<Input> = {
  key: "meeting-event-launch-bot",
  type: "perform",
  resource: "meeting-event",
  title: "Launch Meeting Assistant",
  description:
    "Send the Leexi meeting assistant to a meeting event now (or stop one that is running). A bot already running answers 409.",
  idempotent: false,
  params: [
    {
      key: "uuid",
      label: "Meeting event UUID",
      type: "string",
      required: true,
    },
    {
      key: "stop_task",
      label: "Stop the running assistant",
      type: "boolean",
      hint: "Set true to stop an assistant that is already running instead of launching one.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request(
      "POST",
      `/meeting_events/${seg(input.uuid)}/launch_bot`,
      {
        body: compact({ stop_task: input.stop_task }),
      },
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default meetingEventLaunchBot;
