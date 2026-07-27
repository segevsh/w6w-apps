import type { ActionDefinition } from "@w6w/types";
import { compact, IntercomClient } from "../lib/client.ts";

interface Input {
  companyId: string;
  name?: string;
  plan?: string;
  size?: number;
  website?: string;
  industry?: string;
  monthlySpend?: number;
  remoteCreatedAt?: number;
  customAttributes?: Record<string, unknown>;
}

/**
 * POST /companies — create or update a company. Intercom keys on your own
 * `company_id`: the same call creates the company the first time and updates it
 * thereafter, so there is one action rather than a separate create and update.
 */
const companyCreateOrUpdate: ActionDefinition<Input> = {
  key: "company-create-or-update",
  type: "perform",
  resource: "company",
  title: "Create or Update Company",
  description:
    "Create a company, or update it if one already exists with the same company ID. Idempotent on company ID.",
  idempotent: true,
  params: [
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      required: true,
      hint: "Your own unique id for the company. Cannot be changed once set.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "plan", label: "Plan", type: "string" },
    { key: "size", label: "Size (employees)", type: "number" },
    { key: "website", label: "Website", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "monthlySpend", label: "Monthly spend", type: "number", advanced: true },
    {
      key: "remoteCreatedAt",
      label: "Remote created at (Unix seconds)",
      type: "number",
      advanced: true,
    },
    { key: "customAttributes", label: "Custom attributes", type: "json", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Intercom company ID" },
    { key: "company_id", type: "string", label: "Company ID" },
  ],

  execute(input, ctx) {
    const body = compact({
      company_id: input.companyId,
      name: input.name,
      plan: input.plan,
      size: input.size,
      website: input.website,
      industry: input.industry,
      monthly_spend: input.monthlySpend,
      remote_created_at: input.remoteCreatedAt,
      custom_attributes: input.customAttributes,
    });
    return new IntercomClient(ctx).request("/companies", { method: "POST", body });
  },
};

export default companyCreateOrUpdate;
