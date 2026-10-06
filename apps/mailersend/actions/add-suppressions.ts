import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, toList } from "../lib/client.ts";

interface Input {
  type: string;
  domainId?: string;
  recipients?: unknown;
  patterns?: unknown;
}

const ADDABLE = ["blocklist", "hard-bounces", "spam-complaints", "unsubscribes"];

const addSuppressions: ActionDefinition<Input> = {
  key: "add-suppressions",
  type: "perform",
  resource: "suppression",
  title: "Add Suppressions",
  description:
    "Add recipients to a suppression list (POST /v1/suppressions/{type}). Mail to them is then suppressed. `domainId` is required for hard bounces, spam complaints and unsubscribes; the blocklist also accepts regex `patterns` and works account-wide without one. The on-hold list cannot be added to.",
  idempotent: true,
  params: [
    {
      key: "type",
      label: "List",
      type: "select",
      required: true,
      options: [
        { value: "blocklist", label: "Blocklist" },
        { value: "hard-bounces", label: "Hard bounces" },
        { value: "spam-complaints", label: "Spam complaints" },
        { value: "unsubscribes", label: "Unsubscribes" },
      ],
    },
    {
      key: "domainId",
      label: "Domain ID",
      type: "string",
      hint: "Required except for the blocklist.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      hint:
        'Email addresses: `["a@x.com"]` or a comma-separated string. Required unless `patterns` is set.',
    },
    {
      key: "patterns",
      label: "Patterns",
      type: "json",
      hint: 'Blocklist only: regular expressions such as `[".*@example.com"]`.',
    },
  ],
  output: [{ key: "data", type: "array", label: "The entries created" }],

  execute(input, ctx) {
    if (!ADDABLE.includes(input.type)) {
      throw new Error(`cannot add to suppression list "${input.type}"`);
    }
    const recipients = toList(input.recipients);
    const patterns = toList(input.patterns);
    if (input.type !== "blocklist" && !input.domainId) {
      throw new Error(`domainId is required for ${input.type}`);
    }
    if (input.type !== "blocklist" && patterns) {
      throw new Error("patterns are only supported on the blocklist");
    }
    if (!recipients && !patterns) throw new Error("provide recipients or patterns");
    return new MailerSendClient(ctx).json(`/suppressions/${input.type}`, {
      method: "POST",
      body: compact({ domain_id: input.domainId, recipients, patterns }),
    });
  },
};

export default addSuppressions;
