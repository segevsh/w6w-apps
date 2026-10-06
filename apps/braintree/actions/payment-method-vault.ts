import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient, compact } from "../lib/client.ts";
import { PAYMENT_METHOD_FIELDS } from "../lib/selections.ts";
import { PAYMENT_METHOD_OUTPUT } from "../lib/payment-methods.ts";

interface Input {
  paymentMethodId: string;
  customerId?: string;
  makeDefault?: boolean;
}

/** `vaultPaymentMethod` — turn a single-use nonce into a reusable payment method. */
const paymentMethodVault: ActionDefinition<Input> = {
  key: "payment-method-vault",
  type: "perform",
  resource: "payment-method",
  title: "Vault Payment Method",
  description:
    "Store a single-use payment method (a client-SDK nonce) in the vault so it can be charged repeatedly. Verification runs by default for types that support it.",
  idempotent: false,
  params: [
    {
      key: "paymentMethodId",
      label: "Single-use payment method ID",
      type: "string",
      required: true,
      hint: "The nonce from the client SDK. It is consumed by vaulting.",
    },
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "GraphQL ID of the customer to attach the stored method to.",
    },
    { key: "makeDefault", label: "Make default for the customer", type: "boolean" },
  ],
  output: [
    ...PAYMENT_METHOD_OUTPUT,
    { key: "verification", type: "object", label: "Verification run before vaulting, if any" },
  ],

  async execute(input, ctx) {
    const payload = await new BraintreeClient(ctx).field<{
      paymentMethod: Record<string, unknown> | null;
      verification: Record<string, unknown> | null;
    }>(
      "vaultPaymentMethod",
      `mutation Vault($input: VaultPaymentMethodInput!) {
        vaultPaymentMethod(input: $input) {
          paymentMethod { ${PAYMENT_METHOD_FIELDS} }
          verification { id status }
        }
      }`,
      {
        input: compact({
          paymentMethodId: input.paymentMethodId,
          customerId: input.customerId,
          makeDefault: input.makeDefault,
        }),
      },
    );
    return { ...(payload.paymentMethod ?? {}), verification: payload.verification ?? null };
  },
};

export default paymentMethodVault;
