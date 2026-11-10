import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import sequenceContactList from "../actions/sequence-contact-list.ts";

export default pollFromListAction({
  key: "new-sequence-contact",
  title: "New Sequence Contact",
  description: "The run gets each contact newly enrolled in a sequence.",
  action: sequenceContactList as unknown as ActionDefinition,
  params: [{
    key: "sequenceId",
    label: "Sequence ID",
    type: "number",
    required: true,
    hint: "Reply's numeric sequence id, from a List Sequences result.",
  }],
  input: (params: { sequenceId: number }) => ({
    id: params.sequenceId,
    sort_by: "addingDate",
    sort_direction: "desc",
    top: 100,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { contactId?: unknown }).contactId ?? ""),
  output: [
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "statusInSequence", type: "string", label: "Status in sequence" },
  ],
  sample: { contactId: 101, email: "ada@example.com", statusInSequence: "active" },
  maxPages: 1,
});
