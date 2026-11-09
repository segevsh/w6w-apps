import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMembers from "../actions/list-members.ts";

interface Params {
  listId: string;
}

function members(result: unknown): unknown[] {
  const value = result as { members?: unknown[] };
  return Array.isArray(value.members) ? value.members : [];
}

function memberId(item: unknown): string {
  const value = item as { id?: unknown; email_address?: unknown };
  const id = value.id ?? value.email_address;
  if (typeof id !== "string" || !id) throw new Error("Mailchimp member has no id.");
  return id;
}

const output: OutputField[] = [
  { key: "id", type: "string", label: "Member ID" },
  { key: "email_address", type: "string", label: "Email address" },
  { key: "status", type: "string", label: "Status" },
  { key: "last_changed", type: "string", label: "Last changed" },
];

/** Mailchimp's signed webhook delivery is intentionally replaced with a safe list poll. */
export default pollFromListAction<Params>({
  key: "new-member",
  title: "New Audience Member",
  description: "Fires when an audience member is newly listed. The run gets the member.",
  action: listMembers as unknown as ActionDefinition,
  params: [{ key: "listId", label: "Audience", type: "string", required: true }],
  input: ({ listId }) => ({
    listId,
    count: 100,
    offset: 0,
    sort: "last_changed",
    sortDir: "DESC",
  }),
  items: members,
  idOf: memberId,
  output,
  sample: {
    id: "c0ffee",
    email_address: "ada@example.com",
    status: "subscribed",
    last_changed: "2026-11-09T10:00:00+00:00",
  },
});
