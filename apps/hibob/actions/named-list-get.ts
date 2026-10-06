import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { includeArchivedParam, requireString } from "../lib/params.ts";

interface Input {
  listName: string;
  includeArchived?: boolean;
}

/** `GET /v1/company/named-lists/{listName}` — one list by its internal name; items nest via `children`. */
const namedListGet: ActionDefinition<Input> = {
  key: "named-list-get",
  type: "read",
  resource: "metadata",
  title: "Get Company List",
  description: "Read one company list by its internal name, with its items.",
  params: [
    {
      key: "listName",
      label: "List name",
      type: "string",
      required: true,
      hint: "The list's internal name, as returned by List Company Lists (e.g. site, department).",
    },
    includeArchivedParam,
  ],
  output: [
    { key: "name", type: "string", label: "List name" },
    { key: "items", type: "array", label: "Items (id, value, name, archived, children)" },
  ],

  async execute(input, ctx) {
    const name = requireString(input.listName, "listName");
    return await new HibobClient(ctx).get(`/company/named-lists/${encodeId(name)}`, {
      includeArchived: input.includeArchived ? true : undefined,
    });
  },
};

export default namedListGet;
