import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  domain_id: string;
}

const ipnDelete: ActionDefinition<Input> = {
  key: "ipn-delete",
  type: "perform",
  resource: "ipn",
  title: "Delete IPN Connection",
  description: "Delete the IPN connection with the given domain ID.",
  idempotent: true,
  params: [
    { key: "domain_id", label: "Domain ID", type: "string", required: true },
  ],
  output: [{ key: "result", type: "object", label: "Digistore24 response data" }],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("ipnDelete", compact({ domain_id: input.domain_id }), {
      write: true,
    });
  },
};

export default ipnDelete;
