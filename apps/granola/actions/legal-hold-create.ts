import type { ActionDefinition } from "@w6w/types";
import { compact, GranolaClient, type GranolaLegalHold } from "../lib/client.ts";
import { custodianParams, toCustodians } from "../lib/params.ts";

/**
 * `POST /v1/legal-holds` — place a named hold. Granola then preserves the
 * covered users' notes, transcripts and attachments. `covers_entire_workspace`
 * is required on purpose: scope is never something a caller falls into. Not
 * idempotent (409 is documented for a conflicting create).
 */
interface Input {
  name: string;
  coversEntireWorkspace: boolean;
  description?: string;
  emails?: string[] | string;
  userIds?: string[] | string;
}

const legalHoldCreate: ActionDefinition<Input> = {
  key: "legal-hold-create",
  type: "perform",
  resource: "legal-hold",
  title: "Create Legal Hold",
  description: "Place a legal hold on named custodians and/or the entire workspace.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 200 },
      hint: "The matter this hold preserves.",
    },
    {
      key: "coversEntireWorkspace",
      label: "Covers entire workspace",
      type: "boolean",
      required: true,
      default: false,
      hint: "Cover every member, current and future. Additive with named custodians.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      validation: { maxLength: 2000 },
    },
    ...custodianParams,
  ],
  output: [
    { key: "id", type: "string", label: "Legal hold ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "covers_entire_workspace", type: "boolean", label: "Workspace-wide" },
    { key: "custodian_count", type: "number", label: "Named custodians" },
    { key: "created_at", type: "string", label: "Placed at" },
  ],

  execute(input, ctx) {
    const custodians = toCustodians(input.emails, input.userIds);
    return new GranolaClient(ctx).request<GranolaLegalHold>("/legal-holds", {
      method: "POST",
      body: compact({
        name: input.name,
        covers_entire_workspace: Boolean(input.coversEntireWorkspace),
        description: input.description || undefined,
        custodians: custodians.length ? custodians : undefined,
      }),
    });
  },
};

export default legalHoldCreate;
