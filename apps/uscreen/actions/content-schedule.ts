import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  contentId: string;
  scheduledDatetime: string;
  schedulePublished?: boolean;
}

const contentSchedule: ActionDefinition<Input> = {
  key: "content-schedule",
  type: "perform",
  resource: "content",
  title: "Schedule Content",
  description:
    "Schedule a video or collection for future publication. Not available for live events (use Publish with a launch time). Rescheduling published content needs the confirm flag.",
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
      "key": "scheduledDatetime",
      "label": "Publish at",
      "type": "string",
      "required": true,
      "hint": "RFC 3339, must be in the future.",
    },
    {
      "key": "schedulePublished",
      "label": "Allow rescheduling published content",
      "type": "boolean",
      "hint":
        "Required to reschedule content that is currently published; it will be unpublished until the new date.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/contents/${seg(input.contentId)}/visibility/schedule`,
      {
        query: {
          "scheduled_datetime": input.scheduledDatetime,
          "schedule_published": input.schedulePublished,
        },
      },
    )) ?? {};
  },
};

export default contentSchedule;
