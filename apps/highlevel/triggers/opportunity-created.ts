import { webhookTrigger } from "../lib/triggers.ts";

/** An opportunity is created (webhook event `OpportunityCreate`). */
const opportunityCreated = webhookTrigger({
  key: "opportunity-created",
  title: "New Opportunity",
  description:
    "Fires when an opportunity is created in a HighLevel location (webhook event OpportunityCreate). The run gets the location id, the opportunity id, its contact id and the full opportunity payload (pipeline, stage, status, monetary value).",
  eventType: "OpportunityCreate",
  sample: {
    type: "OpportunityCreate",
    locationId: "sample-location-id",
    id: "sample-opportunity-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "OpportunityCreate",
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

export default opportunityCreated;
