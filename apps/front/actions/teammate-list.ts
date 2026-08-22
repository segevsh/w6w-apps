import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /teammates` — verified against Front's own OpenAPI document
 * (`list-teammates`).
 *
 * Everyone in the company, with the `tea_…` ids that assignment, following and
 * comment authorship all ask for.
 *
 * Two fields decide whether a teammate can actually take work:
 * **`is_available`** (Front's own away toggle) and **`is_blocked`**. A
 * round-robin that ignores them assigns conversations to somebody on holiday,
 * where they sit until a human notices — so both are in the output rather than
 * left to a second lookup.
 */
const action: ActionDefinition = {
  key: "teammate-list",
  type: "read",
  resource: "teammate",
  title: "List teammates",
  description:
    "The company's teammates and their ids — including who is available, which is what stops a " +
    "round-robin assigning to somebody who is away.",
  params: [...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Teammate ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
    { key: "first_name", type: "string", label: "First Name" },
    { key: "last_name", type: "string", label: "Last Name" },
    { key: "is_available", type: "boolean", label: "Available" },
    { key: "is_blocked", type: "boolean", label: "Blocked" },
    { key: "is_admin", type: "boolean", label: "Admin" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new FrontClient(ctx).requestAll("/teammates", {}, returnAll ? Infinity : limit);
  },
};

export default action;
