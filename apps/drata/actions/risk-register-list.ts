import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import { expandParam, pageParams } from "../lib/params.ts";

/**
 * `GET /risk-registers` — List the risk registers (each holds a set of risks) — the id every risk action needs.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  name?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "risk-register-list",
  type: "search",
  resource: "risk-register",
  title: "List Risk Registers",
  description:
    "List the risk registers (each holds a set of risks) — the id every risk action needs.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Substring match." },
    expandParam(["workspaces"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Risk registers" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching records (only with Include total count, first page)",
    },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(`/risk-registers`, {
      "name": input.name,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
