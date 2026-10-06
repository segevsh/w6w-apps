import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, includeArchivedParam } from "../lib/params.ts";

interface Input {
  employeeId: string;
  includeArchived?: boolean;
}

/**
 * `GET /v1/people/{id}/lifecycle` — List an employee's lifecycle status history (hired, employed, terminated, ...). Reading table history needs **View history**
 * on the table's category (not available per field) in addition to View, so a
 * 403 here with a working credential usually means that grant is missing.
 */
const lifecycleHistoryList: ActionDefinition<Input> = {
  key: "lifecycle-history-list",
  type: "read",
  resource: "employee-table",
  title: "List Lifecycle History",
  description: "List an employee's lifecycle status history (hired, employed, terminated, ...).",
  params: [employeeIdParam, includeArchivedParam],
  output: [{
    key: "values",
    type: "array",
    label: "Table entries, newest first as Bob returns them",
  }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get(`/people/${encodeId(input.employeeId)}/lifecycle`, {
      includeArchived: input.includeArchived ? true : undefined,
    });
  },
};

export default lifecycleHistoryList;
