import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GranolaClient, type GranolaLegalHold } from "../lib/client.ts";
import { holdIdParam } from "../lib/params.ts";

/**
 * `PATCH /v1/legal-holds/{hold_id}` — rename, re-describe, or toggle
 * workspace-wide coverage (which never touches the named custodians). A
 * released hold cannot be updated (409). "Clear description" sends
 * `description: null`, the vendor's documented way to clear it.
 */
interface Input {
  holdId: string;
  name?: string;
  description?: string;
  clearDescription?: boolean;
  coversEntireWorkspace?: boolean;
}

const legalHoldUpdate: ActionDefinition<Input> = {
  key: "legal-hold-update",
  type: "perform",
  resource: "legal-hold",
  title: "Update Legal Hold",
  description: "Rename or re-describe a hold, or widen/narrow its workspace-wide coverage.",
  idempotent: true,
  params: [
    holdIdParam,
    { key: "name", label: "Name", type: "string", validation: { minLength: 1, maxLength: 200 } },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 2000 } },
    {
      key: "clearDescription",
      label: "Clear description",
      type: "boolean",
      hint: "Set the description to null (overrides Description).",
    },
    {
      key: "coversEntireWorkspace",
      label: "Covers entire workspace",
      type: "boolean",
      hint: "Leave unset to keep the current coverage.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Legal hold ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "covers_entire_workspace", type: "boolean", label: "Workspace-wide" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<GranolaLegalHold>(
      `/legal-holds/${encodeId(input.holdId)}`,
      {
        method: "PATCH",
        body: compact({
          name: input.name || undefined,
          description: input.clearDescription ? null : input.description || undefined,
          covers_entire_workspace: input.coversEntireWorkspace,
        }),
      },
    );
  },
};

export default legalHoldUpdate;
