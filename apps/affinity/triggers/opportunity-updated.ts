import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "opportunity-updated",
  title: "Opportunity Updated",
  event: "opportunity.updated",
  noun: "opportunity",
  sampleBody: { "id": 4100, "name": "Series A", "list_id": 26 },
});
