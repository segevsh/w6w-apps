import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "opportunity-created",
  title: "Opportunity Created",
  event: "opportunity.created",
  noun: "opportunity",
  sampleBody: { "id": 4100, "name": "Series A", "list_id": 26 },
});
