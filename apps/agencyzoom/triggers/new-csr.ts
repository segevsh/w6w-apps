import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import csrList from "../actions/csr-list.ts";

export default snapshotTrigger<Record<string, never>>({
  key: "new-csr",
  title: "New CSR",
  description: "The run gets each new Customer Service Representative configured for the agency.",
  action: csrList as unknown as ActionDefinition,
  input: () => ({}),
  pick: (result) => arrayAt(result, "csrs"),
  idOf: idField("id"),
  output: [
    { key: "id", type: "number", label: "CSR ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 12, name: "Pat Jones" },
});
