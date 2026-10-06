import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";

interface Input {
  email?: string;
  firstName?: string;
  lastName?: string;
  tags?: string;
  leadIps?: string;
  phoneNumbers?: string;
  stage?: string;
  adOptimizationConsent?: string;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create or Update Lead",
  description:
    "Create a lead (or update it if the email already exists) and apply tags. A tag matching a product also creates a sale.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Required unless a phone number is given.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tags to apply." },
    {
      key: "leadIps",
      label: "IP addresses",
      type: "string",
      hint: "Comma-separated; used for ad attribution.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated. Required unless an email is given.",
    },
    { key: "stage", label: "Stage", type: "string", hint: "Name of the lead stage to apply." },
    {
      key: "adOptimizationConsent",
      label: "Ad optimization consent",
      type: "select",
      options: [
        { value: "GRANTED", label: "Granted" },
        { value: "DENIED", label: "Denied" },
        { value: "UNSPECIFIED", label: "Unspecified" },
      ],
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    const phones = csv(input.phoneNumbers);
    if (!input.email && phones.length === 0) {
      throw new Error("Hyros requires an email or at least one phone number to create a lead.");
    }
    return new HyrosClient(ctx).write("POST", "/leads", {
      body: compact({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        tags: csv(input.tags),
        leadIps: csv(input.leadIps),
        phoneNumbers: phones,
        stage: input.stage,
        adOptimizationConsent: input.adOptimizationConsent,
      }),
    });
  },
};

export default leadCreate;
