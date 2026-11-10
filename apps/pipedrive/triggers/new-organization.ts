import { createdTrigger } from "../lib/triggers.ts";

/** A Pipedrive `create.organization` webhook (registered through the API). */
export default createdTrigger({
  key: "new-organization",
  title: "New Organization",
  description: "Fires when an organization is created. The run gets the new organization.",
  object: "organization",
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "owner_id", type: "string", label: "Owner ID" },
    { key: "add_time", type: "string", label: "Added at" },
  ],
  sample: { id: "5", name: "Acme Ltd", owner_id: "1234", add_time: "2026-11-10T09:30:00Z" },
});
