import type { ActionDefinition } from "@w6w/types";
import { compact, MixmaxClient, scheduledAt, seg, sequenceRecipients } from "../lib/client.ts";

interface Input {
  sequenceId: string;
  recipients: unknown;
  scheduledAt?: string | number;
  enrich?: boolean;
  allowMissingVariables?: boolean;
}

const sequenceRecipientAdd: ActionDefinition<Input> = {
  key: "sequence-recipient-add",
  type: "perform",
  resource: "sequence",
  title: "Add Sequence Recipients",
  description:
    "Add recipients to a sequence, optionally with per-recipient variables, and report the status of each recipient.",
  idempotent: false,
  params: [
    {
      key: "sequenceId",
      label: "Sequence ID",
      type: "string",
      required: true,
      hint: "The sequence to add recipients to.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint: "Array of `{email, variables?, scheduledAt?}`, or a comma-separated list of emails.",
    },
    {
      key: "scheduledAt",
      label: "Scheduled at",
      type: "string",
      hint:
        "Unix timestamp in milliseconds to activate at. Omit to send now; `false` keeps recipients in draft.",
    },
    {
      key: "enrich",
      label: "Enrich",
      type: "boolean",
      hint: "Fill variables from stored Mixmax contact data.",
    },
    {
      key: "allowMissingVariables",
      label: "Allow missing variables",
      type: "boolean",
      hint: "Add recipients even when a required variable is missing.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Per-recipient status" }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request(
      "POST",
      `/sequences/${seg(input.sequenceId)}/recipients`,
      {
        body: compact({
          recipients: sequenceRecipients(input.recipients),
          scheduledAt: scheduledAt(input.scheduledAt),
          enrich: input.enrich,
          allowMissingVariables: input.allowMissingVariables,
        }),
      },
    );
    return { results: Array.isArray(r) ? r : [] };
  },
};

export default sequenceRecipientAdd;
