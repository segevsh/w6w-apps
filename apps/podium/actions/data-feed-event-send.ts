import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
  event: unknown;
}

const dataFeedEventSend: ActionDefinition<Input> = {
  key: "data-feed-event-send",
  type: "perform",
  resource: "data-feed",
  title: "Send Data Feed Event",
  description:
    "Push one event (or a list of events) through a data feed to trigger a Podium automation. The body shape depends on how the data feed was configured. Requires scope `write_data_feed_event`.",
  idempotent: false,
  params: [{
    key: "uid",
    label: "Data feed UID",
    type: "string",
    required: true,
  }, {
    key: "event",
    label: "Event",
    type: "json",
    required: true,
    hint: "JSON object, or an array of objects, matching the data feed setup.",
  }],

  output: [{ key: "accepted", type: "boolean", label: "Podium accepted the event" }],

  async execute(input, ctx) {
    // Podium documents no response body for this route; a 2xx is the acknowledgement.
    await new PodiumClient(ctx).one(`/dataFeeds/${encodeId(input.uid)}/events`, {
      method: "POST",
      body: asJson(input.event, "Event"),
    });
    return { accepted: true };
  },
};

export default dataFeedEventSend;
