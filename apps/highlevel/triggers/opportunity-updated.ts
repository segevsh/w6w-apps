import { webhookTrigger } from "../lib/triggers.ts";

/** An opportunity is updated (webhook event `OpportunityUpdate`). */
const opportunityUpdated = webhookTrigger({
  key: "opportunity-updated",
  title: "Opportunity Updated",
  description:
    "Fires when an opportunity is updated in a HighLevel location (webhook event OpportunityUpdate). The run gets the location id, the opportunity id, its contact id and the full opportunity payload.",
  eventType: "OpportunityUpdate",
  sample: {
    type: "OpportunityUpdate",
    locationId: "sample-location-id",
    id: "sample-opportunity-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "OpportunityUpdate",
      locationId: "sample-location-id",
      id: "sample-opportunity-id",
      contactId: "sample-contact-id",
      name: "Sample deal",
      pipelineId: "sample-pipeline-id",
      pipelineStageId: "sample-stage-id",
      status: "open",
      monetaryValue: 40,
      dateAdded: "2026-11-10T12:41:02.193Z",
    },
  },
});

export default opportunityUpdated;
