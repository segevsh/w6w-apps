import type { ActionDefinition } from "@w6w/types";
import { DubClient, seg } from "../lib/client.ts";

interface Input {
  domain: string;
}

/** `DELETE /domains/{slug}` — cannot be undone and removes the domain's links too. */
const domainDelete: ActionDefinition<Input> = {
  key: "domain-delete",
  type: "perform",
  resource: "domain",
  title: "Delete Domain",
  description:
    "Delete a domain from the workspace. This cannot be undone and also deletes every link on the domain.",
  idempotent: true,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "go.example.com",
    },
  ],
  output: [{ key: "slug", type: "string", label: "Name of the deleted domain" }],

  execute(input, ctx) {
    return new DubClient(ctx).request("DELETE", `/domains/${seg(input.domain)}`);
  },
};

export default domainDelete;
