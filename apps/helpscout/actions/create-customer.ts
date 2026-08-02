import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient, unset } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  organization?: string;
  organizationId?: number;
  background?: string;
}

const createCustomer: ActionDefinition<Input> = {
  key: "create-customer",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer record.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "number",
      advanced: true,
      hint: "Preferred over Organization name — see Help Scout's Organizations API.",
    },
    {
      key: "organization",
      label: "Organization name",
      type: "string",
      advanced: true,
      hint: "Deprecated by Help Scout in favor of Organization ID. Ignored when an ID is set.",
    },
    {
      key: "background",
      label: "Notes",
      type: "text",
      advanced: true,
      config: { multiline: true },
    },
  ],
  output: [{ key: "id", type: "number", label: "Customer ID" }],

  async execute(input, ctx) {
    const { resourceId } = await new HelpScoutClient(ctx).create("/customers", {
      firstName: unset(input.firstName),
      lastName: unset(input.lastName),
      phone: unset(input.phone),
      jobTitle: unset(input.jobTitle),
      organizationId: input.organizationId,
      organization: input.organizationId ? undefined : unset(input.organization),
      background: unset(input.background),
      emails: input.email ? [{ type: "work", value: input.email }] : undefined,
    });
    return { id: resourceId };
  },
};

export default createCustomer;
