import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import { fieldParam, pageBody } from "../lib/pages.ts";
import { EVENT_FIELDS, EVENT_OUTPUT } from "../lib/resources.ts";

/** `POST /event_campaigns/{id}/events` — an event that belongs to an event campaign. */
const eventCampaignEventCreate: ActionDefinition<Input> = {
  key: "event-campaign-event-create",
  type: "perform",
  resource: "event-campaign",
  title: "Create Event in Event Campaign",
  description:
    "Create an event under an event campaign. Events in a campaign with vetting enabled start as pending_approval.",
  idempotent: false,
  params: [
    idParam("eventCampaignId", "Event campaign ID"),
    ...EVENT_FIELDS.map((f) => fieldParam(f, "create")),
  ],
  output: EVENT_OUTPUT,

  execute(input, ctx) {
    for (const f of EVENT_FIELDS) if (f.create === "required") need(input, f.key);
    return new ActionNetworkClient(ctx).create(
      `/event_campaigns/${seg(need(input, "eventCampaignId"))}/events`,
      pageBody({ fields: EVENT_FIELDS }, input, "create"),
    );
  },
};

export default eventCampaignEventCreate;
