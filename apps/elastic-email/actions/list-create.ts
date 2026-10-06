import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, toList } from "../lib/client.ts";

type Input = Record<string, unknown>;

/** `POST /v4/lists` — the vendor answers `201` with the new list. */
const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a contact list, optionally seeded with existing contacts.",
  idempotent: false,
  params: [
    { key: "listName", label: "List name", type: "string", required: true },
    {
      key: "allowUnsubscribe",
      label: "Allow unsubscribe",
      type: "boolean",
      hint: "Whether members may unsubscribe from this list.",
    },
    {
      key: "emails",
      label: "Contacts",
      type: "string",
      hint: "Comma-separated emails of contacts to put in the list.",
    },
  ],
  output: [
    { key: "ListName", type: "string", label: "List name" },
    { key: "PublicListID", type: "string", label: "Public list id" },
  ],
  async execute(input, ctx) {
    const name = String(input.listName ?? "").trim();
    if (!name) throw new Error("List name is required");
    return await new ElasticClient(ctx).json("/lists", {
      method: "POST",
      body: compact({
        ListName: name,
        AllowUnsubscribe: input.allowUnsubscribe,
        Emails: toList(input.emails as string | undefined),
      }),
    });
  },
};

export default listCreate;
