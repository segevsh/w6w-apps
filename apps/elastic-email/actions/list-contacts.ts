import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, encodeId } from "../lib/client.ts";
import { pagingParams, wrapList } from "../lib/factory.ts";

type Input = Record<string, unknown>;

/** `GET /v4/lists/{listname}/contacts` */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts in List",
  description: "List the contacts that belong to one list.",
  params: [
    { key: "listName", label: "List name", type: "string", required: true },
    ...pagingParams,
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Items on this page" },
  ],
  async execute(input, ctx) {
    const name = String(input.listName ?? "").trim();
    if (!name) throw new Error("List name is required");
    const out = await new ElasticClient(ctx).json(`/lists/${encodeId(name)}/contacts`, {
      query: compact({ limit: input.limit, offset: input.offset }) as Record<string, string>,
    });
    return wrapList(out);
  },
};

export default listContacts;
