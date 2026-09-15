import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { subscriberIdParam } from "../lib/params.ts";
import type { AddEventSubscriber } from "../lib/schema.ts";

/** `GET /subscribers/{subscriber_id}` — retrieve one calendar subscriber object. */
interface Input {
  subscriberId: string;
}

const calendarSubscriberRetrieve: ActionDefinition<Input> = {
  key: "calendar-subscriber-retrieve",
  type: "read",
  resource: "calendar-subscriber",
  title: "Retrieve Calendar Subscriber",
  description: "Fetch one calendar subscriber by id.",
  params: [subscriberIdParam],
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "calendar_id", type: "string", label: "Calendar ID" },
    { key: "subscriber_status", type: "string", label: "Status" },
    { key: "calendar_type", type: "string", label: "Calendar client used to subscribe" },
    { key: "sync_count", type: "number", label: "Times synced" },
    { key: "synced", type: "string", label: "Last synced at" },
    { key: "subscriber_form_data", type: "object", label: "Subscriber form answers" },
    { key: "geo_location", type: "object", label: "Location at time of subscription" },
    { key: "created", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<AddEventSubscriber>(
      `/subscribers/${encodeURIComponent(input.subscriberId)}`,
    );
  },
};

export default calendarSubscriberRetrieve;
