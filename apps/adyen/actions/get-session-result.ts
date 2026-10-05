import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, encodeId } from "../lib/client.ts";
import {} from "../lib/params.ts";

/**
 * `GET /sessions/{sessionId}?sessionResult=...` — both are required by the spec.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  sessionId: string;
  sessionResult: string;
}

const getSessionResult: ActionDefinition<Input> = {
  key: "get-session-result",
  type: "read",
  resource: "session",
  title: "Get Session Result",
  description: "Get the result of a Checkout session: its status and the payments made in it.",
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "The id returned by create-session.",
    },
    {
      key: "sessionResult",
      label: "Session result",
      type: "string",
      required: true,
      hint:
        "The sessionResult value Adyen appends to the return URL, or hands the client on completion.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    {
      key: "status",
      type: "string",
      label: "Status (active, canceled, completed, expired, paymentPending, refused)",
    },
    { key: "reference", type: "string", label: "Reference" },
    { key: "payments", type: "array", label: "Payments" },
    { key: "additionalData", type: "object", label: "Additional data" },
  ],

  execute(input, ctx) {
    return new AdyenClient(ctx).get(`/sessions/${encodeId(input.sessionId)}`, {
      sessionResult: input.sessionResult,
    });
  },
};

export default getSessionResult;
