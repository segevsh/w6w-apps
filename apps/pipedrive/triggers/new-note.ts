import { createdTrigger } from "../lib/triggers.ts";

/** A Pipedrive `create.note` webhook (registered through the API). */
export default createdTrigger({
  key: "new-note",
  title: "New Note",
  description:
    "Fires when a note is added to a deal, person, organization or lead. The run gets the new note.",
  object: "note",
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "deal_id", type: "string", label: "Deal ID" },
    { key: "person_id", type: "string", label: "Person ID" },
    { key: "org_id", type: "string", label: "Organization ID" },
  ],
  sample: {
    id: "3",
    content: "Asked about renewal pricing.",
    deal_id: "42",
    person_id: "7",
    org_id: "5",
  },
});
