import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  ipn_url: string;
  name: string;
  product_ids: string;
  domain_id?: string;
  categories?: string;
  transactions?: string;
  timing?: "before_thankyou" | "delayed";
  sha_passphrase?: string;
  newsletter_send_policy?:
    | "end_policy_send_always"
    | "end_if_not_optout"
    | "end_if_optout"
    | "end_if_optin";
}

const ipnSetup: ActionDefinition<Input> = {
  key: "ipn-setup",
  type: "perform",
  resource: "ipn",
  title: "Set Up IPN Connection",
  description:
    "Create an IPN connection so Digistore24 posts payment notifications to a URL. Re-using a domain ID is how a connection is identified for deletion.",
  idempotent: true,
  params: [
    {
      key: "ipn_url",
      label: "IPN URL",
      type: "string",
      required: true,
      hint: "Where Digistore24 sends notifications.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "The name listed in Digistore24 (e.g. your platform).",
    },
    {
      key: "product_ids",
      label: "Product IDs",
      type: "string",
      required: true,
      hint: '"all" or comma-separated product IDs.',
    },
    {
      key: "domain_id",
      label: "Domain ID",
      type: "string",
      hint: "Identifies the connection for deletion and uniqueness. Usually your platform name.",
    },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      hint: "Comma separated, e.g. orders,affiliations,e-tickets,custom forms.",
    },
    {
      key: "transactions",
      label: "Transactions",
      type: "string",
      hint: "Comma separated. Default payment,refund,chargeback,payment_missed.",
    },
    {
      key: "timing",
      label: "Timing",
      type: "select",
      options: [{ value: "before_thankyou", label: "before_thankyou" }, {
        value: "delayed",
        label: "delayed",
      }],
    },
    {
      key: "sha_passphrase",
      label: "SHA passphrase",
      type: "secret",
      hint: 'Signs the notification parameters (max 63 chars). "random" generates one.',
    },
    {
      key: "newsletter_send_policy",
      label: "Newsletter send policy",
      type: "select",
      options: [
        { value: "end_policy_send_always", label: "end_policy_send_always" },
        { value: "end_if_not_optout", label: "end_if_not_optout" },
        { value: "end_if_optout", label: "end_if_optout" },
        { value: "end_if_optin", label: "end_if_optin" },
      ],
    },
  ],
  output: [{ key: "result", type: "object", label: "Digistore24 response data" }],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "ipnSetup",
      compact({
        ipn_url: input.ipn_url,
        name: input.name,
        product_ids: input.product_ids,
        domain_id: input.domain_id,
        categories: input.categories,
        transactions: input.transactions,
        timing: input.timing,
        sha_passphrase: input.sha_passphrase,
        newsletter_send_policy: input.newsletter_send_policy,
      }),
      { write: true },
    );
  },
};

export default ipnSetup;
