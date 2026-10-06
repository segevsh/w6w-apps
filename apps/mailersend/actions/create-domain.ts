import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient } from "../lib/client.ts";

interface Input {
  name: string;
  returnPathSubdomain?: string;
  customTrackingSubdomain?: string;
  inboundRoutingSubdomain?: string;
}

const createDomain: ActionDefinition<Input> = {
  key: "create-domain",
  type: "perform",
  resource: "domain",
  title: "Create Domain",
  description:
    "Add a sending domain (POST /v1/domains). It starts unverified: publish the records from Get Domain DNS Records, then call Verify Domain.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Domain name",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "Lowercase, unique, and resolvable.",
    },
    {
      key: "returnPathSubdomain",
      label: "Return-path subdomain",
      type: "string",
      hint: "Alphanumeric. Defaults to `mta`.",
    },
    {
      key: "customTrackingSubdomain",
      label: "Custom tracking subdomain",
      type: "string",
      hint: "Alphanumeric. Defaults to `email`.",
    },
    {
      key: "inboundRoutingSubdomain",
      label: "Inbound routing subdomain",
      type: "string",
      hint: "Alphanumeric. Defaults to `inbound`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created domain" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json("/domains", {
      method: "POST",
      body: compact({
        name: input.name,
        return_path_subdomain: input.returnPathSubdomain,
        custom_tracking_subdomain: input.customTrackingSubdomain,
        inbound_routing_subdomain: input.inboundRoutingSubdomain,
      }),
    });
  },
};

export default createDomain;
