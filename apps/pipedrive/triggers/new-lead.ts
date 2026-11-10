import { createdTrigger } from "../lib/triggers.ts";

/** A Pipedrive `create.lead` webhook (registered through the API). */
export default createdTrigger({
  key: "new-lead",
  title: "New Lead",
  description: "Fires when a lead is created. The run gets the new lead.",
  object: "lead",
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "owner_id", type: "string", label: "Owner ID" },
    { key: "person_id", type: "string", label: "Person ID" },
    { key: "organization_id", type: "string", label: "Organization ID" },
  ],
  sample: {
    id: "adf21080-0e10-11eb-879b-05d71fb426ec",
    title: "Website enquiry",
    owner_id: "1234",
    person_id: "7",
    organization_id: "5",
  },
});
