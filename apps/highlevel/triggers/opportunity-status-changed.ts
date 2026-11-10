import { webhookTrigger } from "../lib/triggers.ts";

/** An opportunity's status changes (open, won, lost, abandoned) (webhook event `OpportunityStatusUpdate`). */
const opportunityStatusChanged = webhookTrigger({
  key: "opportunity-status-changed",
  title: "Opportunity Status Changed",
  description:
    "Fires when an opportunity's status changes (open, won, lost or abandoned) in a HighLevel location (webhook event OpportunityStatusUpdate). The run gets the location id, the opportunity id, its contact id and the payload with the new status.",
  eventType: "OpportunityStatusUpdate",
  sample: {
    type: "OpportunityStatusUpdate",
    locationId: "sample-location-id",
    id: "sample-opportunity-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "OpportunityStatusUpdate",
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

export default opportunityStatusChanged;
