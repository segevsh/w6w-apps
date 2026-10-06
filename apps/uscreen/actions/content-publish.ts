import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  contentId: string;
  eventLaunchDatetime?: string;
}

const contentPublish: ActionDefinition<Input> = {
  key: "content-publish",
  type: "perform",
  resource: "content",
  title: "Publish Content",
  description:
    "Publish a video, collection or live event. For a live event, an optional launch time lets customers pre-register for that date.",
  idempotent: true,
  params: [
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "required": true,
      "hint": "A video, collection or live event id.",
    },
    {
      "key": "eventLaunchDatetime",
      "label": "Event launch time",
      "type": "string",
      "hint": "Live events only: when the event starts, RFC 3339, must be in the future.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/contents/${seg(input.contentId)}/visibility/publish`,
      { query: { "event_launch_datetime": input.eventLaunchDatetime } },
    )) ?? {};
  },
};

export default contentPublish;
