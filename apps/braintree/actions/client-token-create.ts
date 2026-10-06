import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact } from "../lib/client.ts";

interface Input {
  customerId?: string;
  merchantAccountId?: string;
}

/** `createClientToken` — the token a browser or mobile SDK needs to tokenize a payment method. */
const clientTokenCreate: ActionDefinition<Input> = {
  key: "client-token-create",
  type: "perform",
  resource: "client-token",
  title: "Create Client Token",
  description:
    "Mint a client token for the Braintree browser or mobile SDK. It is a credential for the client: do not log or store it.",
  idempotent: false,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "Scope the token to a customer so the SDK can offer their stored methods.",
    },
    { key: "merchantAccountId", label: "Merchant account ID", type: "string" },
  ],
  output: [{ key: "clientToken", type: "string", label: "Client token (base64)" }],

  async execute(input, ctx) {
    const token = compact({
      customerId: input.customerId,
      merchantAccountId: input.merchantAccountId,
    });
    const payload = await new BraintreeClient(ctx).field<{ clientToken: string | null }>(
      "createClientToken",
      `mutation CreateClientToken($input: CreateClientTokenInput) {
        createClientToken(input: $input) { clientToken }
      }`,
      { input: Object.keys(token).length ? { clientToken: token } : {} },
    );
    return { clientToken: payload.clientToken };
  },
};

export default clientTokenCreate;
