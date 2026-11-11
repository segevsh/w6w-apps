import type { ActionDefinition } from "@w6w/types";
import accountList from "../actions/account-list.ts";
import { idField, SNAPSHOT_PAGE_SIZE, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /accounts` documents cursor paging and no order or time filter, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-account",
  title: "New Account",
  description: "The run gets each newly created customer account.",
  action: accountList as unknown as ActionDefinition,
  paged: true,
  input: () => ({ limit: SNAPSHOT_PAGE_SIZE }),
  items: (result) => (result as { accounts?: unknown[] }).accounts ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domains", type: "array", label: "Domains" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "acc_1",
    name: "Acme Inc",
    domains: ["acme.example"],
    created_at: "2026-11-10T09:00:00Z",
  },
});
