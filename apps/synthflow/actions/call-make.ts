import type { ActionDefinition } from "@w6w/types";
import { compact, SynthflowClient, toKeyValueList } from "../lib/client.ts";

interface Input {
  model_id: string;
  phone: string;
  name: string;
  from_phone_number?: string;
  custom_variables?: unknown;
  lead_email?: string;
  lead_timezone?: string;
  prompt?: string;
  greeting?: string;
}

const callMake: ActionDefinition<Input> = {
  key: "call-make",
  type: "perform",
  resource: "call",
  title: "Make Call",
  description: "Start an outbound phone call from an outbound agent to one recipient.",
  idempotent: false,
  params: [
    {
      key: "model_id",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "An outbound agent.",
    },
    {
      key: "phone",
      label: "Recipient phone number",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +14155551234.",
    },
    { key: "name", label: "Recipient name", type: "string", required: true },
    {
      key: "from_phone_number",
      label: "Caller ID",
      type: "string",
      hint: "Must be a number attached to the outbound agent.",
    },
    {
      key: "custom_variables",
      label: "Custom variables",
      type: "json",
      hint: 'Pre-call variables: a JSON object {"city":"Berlin"} or an array of {key, value}.',
    },
    {
      key: "lead_email",
      label: "Recipient email",
      type: "string",
      hint: "Used to book appointments.",
    },
    {
      key: "lead_timezone",
      label: "Recipient time zone",
      type: "string",
      hint: "IANA name, e.g. Europe/Berlin.",
    },
    {
      key: "prompt",
      label: "Prompt override",
      type: "text",
      hint: "Replaces the agent's prompt for this call.",
    },
    {
      key: "greeting",
      label: "Greeting override",
      type: "string",
      hint: "Replaces the agent's greeting for this call.",
    },
  ],
  output: [{ key: "call_id", type: "string", label: "Call ID" }, {
    key: "answer",
    type: "string",
    label: "Result message",
  }, { key: "eta", type: "number", label: "Seconds until the call starts" }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).request<
      { response?: Record<string, unknown>; eta?: number }
    >("/calls", {
      method: "POST",
      body: compact({
        model_id: input.model_id,
        phone: input.phone,
        name: input.name,
        from_phone_number: input.from_phone_number,
        lead_email: input.lead_email,
        lead_timezone: input.lead_timezone,
        prompt: input.prompt,
        greeting: input.greeting,
        custom_variables: toKeyValueList(input.custom_variables, "custom_variables"),
      }),
    });
    return { ...r.response, eta: r.eta };
  },
};

export default callMake;
