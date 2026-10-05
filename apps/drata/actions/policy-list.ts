import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import { expandParam, opts, pageParams, policyStatuses } from "../lib/params.ts";

/**
 * `GET /policies` — List policies, filtered by name or status.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  name?: string;
  statuses?: string[] | string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "policy-list",
  type: "search",
  resource: "policy",
  title: "List Policies",
  description: "List policies, filtered by name or status.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Substring match." },
    { key: "statuses", label: "Status", type: "multiselect", options: opts(policyStatuses) },
    expandParam(["groups", "weekTimeFrameSlas", "gracePeriodSlas", "p3MatrixSlas", "owner"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Policies" },
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
    return new DrataClient(ctx).list(`/policies`, {
      "name": input.name,
      "statuses[]": toList(input.statuses),
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
