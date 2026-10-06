import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, includeArchivedParam } from "../lib/params.ts";

interface Input {
  employeeId: string;
  includeArchived?: boolean;
}

/**
 * `GET /v1/people/{id}/work` — List an employee's historical work entries (title, department, manager, site). Reading table history needs **View history**
 * on the table's category (not available per field) in addition to View, so a
 * 403 here with a working credential usually means that grant is missing.
 */
const workHistoryList: ActionDefinition<Input> = {
  key: "work-history-list",
  type: "read",
  resource: "employee-table",
  title: "List Work History",
  description: "List an employee's historical work entries (title, department, manager, site).",
  params: [employeeIdParam, includeArchivedParam],
  output: [{
    key: "values",
    type: "array",
    label: "Table entries, newest first as Bob returns them",
  }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get(`/people/${encodeId(input.employeeId)}/work`, {
      includeArchived: input.includeArchived ? true : undefined,
    });
  },
};

export default workHistoryList;
