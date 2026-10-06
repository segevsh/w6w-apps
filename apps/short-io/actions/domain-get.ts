import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  domainId: number;
}

interface Domain {
  id: number;
  hostname: string;
  state?: string;
  [k: string]: unknown;
}

/** GET /domains/{domainId} */
const domainGet: ActionDefinition<Input, Domain> = {
  key: "domain-get",
  type: "read",
  resource: "domain",
  title: "Get Domain",
  description: "Fetch one domain's settings by its numeric id.",
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Domain ID" },
    { key: "hostname", type: "string", label: "Hostname" },
    { key: "state", type: "string", label: "State" },
    { key: "linkType", type: "string", label: "Link type" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new ShortClient(ctx).request<Domain>(`/domains/${input.domainId}`);
  },
};

export default domainGet;
