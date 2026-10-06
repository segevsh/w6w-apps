import type { ActionDefinition } from "@w6w/types";
import { ElasticClient, encodeId, toList } from "../lib/client.ts";

type Input = Record<string, unknown>;

/** `POST /v4/lists/{name}/contacts` (add) and `/contacts/remove` — emails XOR a segment rule. */
export function membershipAction(
  mode: "add" | "remove",
): ActionDefinition<Input> {
  const add = mode === "add";
  return {
    key: add ? "list-add-contacts" : "list-remove-contacts",
    type: "perform",
    resource: "list",
    title: add ? "Add Contacts to List" : "Remove Contacts from List",
    description: add
      ? "Add EXISTING contacts to a list, by email or by a segment rule. Unknown emails are not created; use Add Contact for that."
      : "Remove contacts from a list (the contacts themselves are kept), by email or by a segment rule.",
    idempotent: true,
    params: [
      { key: "listName", label: "List name", type: "string", required: true },
      {
        key: "emails",
        label: "Emails",
        type: "string",
        hint: "Comma-separated emails. Provide either emails or a rule, not both.",
      },
      {
        key: "rule",
        label: "Rule",
        type: "string",
        hint: "SQL-like segment rule; `All` selects every contact. Not combinable with emails.",
      },
    ],
    output: add
      ? [
        { key: "ListName", type: "string", label: "List name" },
        { key: "PublicListID", type: "string", label: "Public list id" },
      ]
      : [{ key: "removed", type: "boolean", label: "Request accepted" }],
    async execute(input, ctx) {
      const name = String(input.listName ?? "").trim();
      if (!name) throw new Error("List name is required");
      const emails = toList(input.emails as string | undefined);
      const rule = input.rule ? String(input.rule) : undefined;
      if ((emails ? 1 : 0) + (rule ? 1 : 0) !== 1) {
        throw new Error("Provide either emails or a rule, not both");
      }
      const out = await new ElasticClient(ctx).json(
        `/lists/${encodeId(name)}/contacts${add ? "" : "/remove"}`,
        { method: "POST", body: emails ? { Emails: emails } : { Rule: rule } },
      );
      return add ? out : { removed: true };
    },
  };
}

export default membershipAction("add");
