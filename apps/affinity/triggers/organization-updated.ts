import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "organization-updated",
  title: "Organization Updated",
  event: "organization.updated",
  noun: "organization",
  sampleBody: { "id": 70796, "name": "Example Inc", "domain": "example.test" },
});
