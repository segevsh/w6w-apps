import { webhookTrigger } from "../lib/triggers.ts";

/** An opportunity is deleted (webhook event `OpportunityDelete`). */
const opportunityDeleted = webhookTrigger({
  key: "opportunity-deleted",
  title: "Opportunity Deleted",
  description:
    "Fires when an opportunity is deleted in a HighLevel location (webhook event OpportunityDelete). The run gets the location id, the id of the deleted opportunity, its contact id and the opportunity payload as it was.",
  eventType: "OpportunityDelete",
  sample: {
    type: "OpportunityDelete",
    locationId: "sample-location-id",
    id: "sample-opportunity-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "OpportunityDelete",
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

export default opportunityDeleted;
