import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /branches/{branch_id}` — one branch's external-facing details. */
interface Input {
  branchId: number;
}

const branchGet: ActionDefinition<Input> = {
  key: "branch-get",
  type: "read",
  resource: "branch",
  title: "Get Branch",
  description: "Fetch one branch by id.",
  params: [idParam("branchId", "Branch ID", "Ids come from List Branches.")],
  output: [
    { key: "id", type: "number", label: "Branch ID" },
    { key: "name", type: "string", label: "Branch name" },
    { key: "externalName", type: "string", label: "Name shown on documents" },
    { key: "taxNumber", type: "string", label: "Tax / GST / VAT number" },
    { key: "address", type: "string", label: "Formatted address" },
    { key: "active", type: "boolean", label: "Is the branch active" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/branches/${encodeId(input.branchId)}`);
  },
};

export default branchGet;
