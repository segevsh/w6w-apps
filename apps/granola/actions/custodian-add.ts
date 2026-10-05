import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient, type GranolaLegalHoldCustodian } from "../lib/client.ts";
import { custodianParams, holdIdParam, toCustodians } from "../lib/params.ts";

/**
 * `POST /v1/legal-holds/{hold_id}/custodians` — name users on a hold, by email
 * or Granola user id (1-100 per call). Idempotent per the vendor: the response
 * is the request's full resolved set, newly added or already present. Refuses
 * to call the API with an empty set rather than sending a guaranteed 400.
 */
interface Input {
  holdId: string;
  emails?: string[] | string;
  userIds?: string[] | string;
}

const custodianAdd: ActionDefinition<Input> = {
  key: "custodian-add",
  type: "perform",
  resource: "legal-hold",
  title: "Add Legal Hold Custodians",
  description: "Name users (by email or user ID) as custodians of a legal hold.",
  idempotent: true,
  params: [holdIdParam, ...custodianParams],
  output: [{ key: "custodians", type: "array", label: "Resolved custodian entries" }],

  execute(input, ctx) {
    const custodians = toCustodians(input.emails, input.userIds);
    if (custodians.length === 0) {
      throw new Error("Add Legal Hold Custodians needs at least one email or user ID");
    }
    if (custodians.length > 100) {
      throw new Error("Granola accepts at most 100 custodians per call");
    }
    return new GranolaClient(ctx).request<{ custodians: GranolaLegalHoldCustodian[] }>(
      `/legal-holds/${encodeId(input.holdId)}/custodians`,
      { method: "POST", body: { custodians } },
    );
  },
};

export default custodianAdd;
