import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "organization-created",
  title: "Organization Created",
  event: "organization.created",
  noun: "organization",
  sampleBody: { "id": 70796, "name": "Example Inc", "domain": "example.test" },
});
