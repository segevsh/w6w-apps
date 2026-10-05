import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  domain_id?: string;
}

const ipnInfo: ActionDefinition<Input> = {
  key: "ipn-info",
  type: "read",
  title: "Get IPN Connection",
  description:
    "Return the settings of an IPN (instant payment notification) connection created via IPN Setup.",
  params: [
    {
      key: "domain_id",
      label: "Domain ID",
      type: "string",
      hint: "The domain ID given when the connection was created.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Digistore24 response data" }],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("ipnInfo", compact({ domain_id: input.domain_id }));
  },
};

export default ipnInfo;
