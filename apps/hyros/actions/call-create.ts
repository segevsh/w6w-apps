import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";

interface Input {
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  leadIps?: string;
  phoneNumbers?: string;
  stage?: string;
  externalId?: string;
  date?: string;
  qualification?: string;
  state?: string;
}

const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Create Call",
  description:
    "Record a call and create the lead if it is not on the account yet. Re-sending an externalId updates that call.",
  idempotent: true,
  params: [
    { key: "name", label: "Call name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "leadIps", label: "IP addresses", type: "string", hint: "Comma-separated." },
    { key: "phoneNumbers", label: "Phone numbers", type: "string", hint: "Comma-separated." },
    { key: "stage", label: "Lead stage", type: "string" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your id for the call; the same id updates the existing call.",
    },
    { key: "date", label: "Call date", type: "string", hint: "ISO 8601. Defaults to now." },
    { key: "qualification", label: "Qualification", type: "string" },
    {
      key: "state",
      label: "State",
      type: "select",
      options: ["QUALIFIED", "UNQUALIFIED", "CANCELLED", "NO_SHOW"].map((v) => ({
        value: v,
        label: v,
      })),
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    const ips = csv(input.leadIps);
    const phones = csv(input.phoneNumbers);
    return new HyrosClient(ctx).write("POST", "/calls", {
      body: compact({
        name: input.name,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        leadIps: ips.length ? ips : undefined,
        phoneNumbers: phones.length ? phones : undefined,
        stage: input.stage,
        externalId: input.externalId,
        date: input.date,
        qualification: input.qualification,
        state: input.state,
      }),
    });
  },
};

export default callCreate;
