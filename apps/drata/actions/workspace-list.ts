import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import { expandParam, pageParams } from "../lib/params.ts";

/**
 * `GET /workspaces` — List the account's workspaces (the container every control, test and evidence item lives in).
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List Workspaces",
  description:
    "List the account's workspaces (the container every control, test and evidence item lives in).",
  params: [
    expandParam(["frameworks", "personnelScope"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Workspaces" },
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
    return new DrataClient(ctx).list(`/workspaces`, {
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
