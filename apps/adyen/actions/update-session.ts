import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody, encodeId } from "../lib/client.ts";
import { additionalFieldsParam, currencyParam, valueParam } from "../lib/params.ts";

/**
 * `PATCH /sessions/{sessionId}`. The request has no `merchantAccount`; `amount` and
 *
 * `sessionData` are required. Setting an absolute amount is idempotent.
 */
interface Input {
  sessionId: string;
  sessionData: string;
  currency: string;
  value: number;
  payable?: boolean;
  additionalFields?: unknown;
}

const updateSessionSpec: BodySpec = {
  fields: ["sessionData", "payable"],
  amount: true,
  merchant: false,
};

const updateSession: ActionDefinition<Input> = {
  key: "update-session",
  type: "perform",
  resource: "session",
  title: "Update Payment Session",
  description: "Update the amount, or the payable flag, of an existing Checkout session.",
  idempotent: true,
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true },
    {
      key: "sessionData",
      label: "Session data",
      type: "string",
      required: true,
      hint: "The sessionData returned by create-session (or the previous update).",
    },
    currencyParam,
    valueParam,
    {
      key: "payable",
      label: "Payable",
      type: "boolean",
      hint: "Set to true when the amount is final and the shopper may pay.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "sessionData", type: "string", label: "Updated session data" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, updateSessionSpec);
    return new AdyenClient(ctx).patch(`/sessions/${encodeId(input.sessionId)}`, body);
  },
};

export default updateSession;
