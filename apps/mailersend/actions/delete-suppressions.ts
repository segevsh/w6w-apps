import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, toList } from "../lib/client.ts";
import { SUPPRESSION_LISTS } from "./list-suppressions.ts";

interface Input {
  type: string;
  ids?: unknown;
  all?: boolean;
  domainId?: string;
}

const deleteSuppressions: ActionDefinition<Input> = {
  key: "delete-suppressions",
  type: "perform",
  resource: "suppression",
  title: "Delete Suppressions",
  description:
    "Remove entries from a suppression list so mail to them flows again (DELETE /v1/suppressions/{type}). Pass the entry `ids` from List Suppressions, or set `all` to empty the list. `all` is destructive: the vendor offers no undo.",
  idempotent: false,
  params: [
    { key: "type", label: "List", type: "select", required: true, options: SUPPRESSION_LISTS },
    {
      key: "ids",
      label: "Entry IDs",
      type: "json",
      hint: "The `id` of each entry to remove. Required unless Delete all is on.",
    },
    {
      key: "all",
      label: "Delete all",
      type: "boolean",
      hint: "Empty the whole list (for the domain, when Domain ID is set).",
    },
    { key: "domainId", label: "Domain ID", type: "string" },
  ],
  output: [{ key: "deleted", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    if (!SUPPRESSION_LISTS.some((l) => l.value === input.type)) {
      throw new Error(`unknown suppression list "${input.type}"`);
    }
    const ids = toList(input.ids);
    if (!ids && !input.all) throw new Error("provide ids, or set all to true");
    if (ids && input.all) throw new Error("provide ids or all, not both");
    await new MailerSendClient(ctx).request(`/suppressions/${input.type}`, {
      method: "DELETE",
      body: compact({ domain_id: input.domainId, ids, all: input.all ? true : undefined }),
    });
    return { deleted: true };
  },
};

export default deleteSuppressions;
