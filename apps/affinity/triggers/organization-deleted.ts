import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "organization-deleted",
  title: "Organization Deleted",
  event: "organization.deleted",
  noun: "organization",
  sampleBody: { "id": 70796, "name": "Example Inc", "domain": "example.test" },
});
