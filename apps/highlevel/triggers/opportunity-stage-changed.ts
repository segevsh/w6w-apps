import { webhookTrigger } from "../lib/triggers.ts";

/** An opportunity moves to another pipeline stage (webhook event `OpportunityStageUpdate`). */
const opportunityStageChanged = webhookTrigger({
  key: "opportunity-stage-changed",
  title: "Opportunity Stage Changed",
  description:
    "Fires when an opportunity's pipeline stage changes in a HighLevel location (webhook event OpportunityStageUpdate). The run gets the location id, the opportunity id, its contact id and the payload with the pipeline and the new stage id.",
  eventType: "OpportunityStageUpdate",
  sample: {
    type: "OpportunityStageUpdate",
    locationId: "sample-location-id",
    id: "sample-opportunity-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "OpportunityStageUpdate",
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

export default opportunityStageChanged;
