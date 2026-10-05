import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient, type GranolaLegalHold } from "../lib/client.ts";
import { holdIdParam } from "../lib/params.ts";

/** `GET /v1/legal-holds/{hold_id}`. */
interface Input {
  holdId: string;
}

const legalHoldGet: ActionDefinition<Input> = {
  key: "legal-hold-get",
  type: "read",
  resource: "legal-hold",
  title: "Get Legal Hold",
  description: "Fetch one legal hold.",
  params: [holdIdParam],
  output: [
    { key: "id", type: "string", label: "Legal hold ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "covers_entire_workspace", type: "boolean", label: "Workspace-wide" },
    { key: "custodian_count", type: "number", label: "Named custodians" },
    { key: "released_at", type: "string", label: "Released at (null while active)" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<GranolaLegalHold>(
      `/legal-holds/${encodeId(input.holdId)}`,
    );
  },
};

export default legalHoldGet;
