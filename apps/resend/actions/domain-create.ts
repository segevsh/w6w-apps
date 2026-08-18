import type { ActionDefinition } from "@w6w/types";
import { compact, ResendClient } from "../lib/client.ts";

/**
 * `POST /domains` — verified against Resend's OpenAPI document (body requires
 * `name`).
 *
 * The response's `records` array is the point: creating a domain does not
 * verify it, it hands back the DNS records that have to exist first. A
 * provisioning workflow writes those to a DNS provider and then calls
 * `domain-verify`.
 */
const action: ActionDefinition = {
  key: "domain-create",
  type: "perform",
  resource: "domain",
  title: "Add a domain",
  description: "Register a sending domain and get the DNS records it needs.",
  // A duplicate name is rejected rather than deduped.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Domain",
      type: "string",
      required: true,
      default: "",
      placeholder: "mail.example.com",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "",
      options: [
        { value: "us-east-1", label: "US East (N. Virginia)" },
        { value: "eu-west-1", label: "Europe (Ireland)" },
        { value: "sa-east-1", label: "South America (São Paulo)" },
        { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
      ],
      hint: "Where the domain's email is sent from. Immutable once set.",
    },
    {
      key: "customReturnPath",
      label: "Custom Return Path",
      type: "string",
      default: "",
      hint: "Subdomain for the Return-Path address. Resend defaults to `send`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Domain ID" },
    { key: "name", type: "string", label: "Domain" },
    { key: "status", type: "string", label: "Status" },
    { key: "region", type: "string", label: "Region" },
    { key: "records", type: "array", label: "Required DNS records" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const body = compact({
      name,
      region: p.region,
      custom_return_path: p.customReturnPath,
    });

    ctx.log("info", "creating Resend domain", { name });

    return await new ResendClient(ctx).request("/domains", { method: "POST", body });
  },
};

export default action;
