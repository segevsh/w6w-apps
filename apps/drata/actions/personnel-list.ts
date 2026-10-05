import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import {
  complianceStatuses,
  employmentStatuses,
  expandParam,
  opts,
  pageParams,
} from "../lib/params.ts";

/**
 * `GET /personnel` — List personnel records — the people Drata tracks compliance for — filtered by employment or compliance status.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  employmentStatus?: string[] | string;
  complianceStatus?: string[] | string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "personnel-list",
  type: "search",
  resource: "personnel",
  title: "List Personnel",
  description:
    "List personnel records — the people Drata tracks compliance for — filtered by employment or compliance status.",
  params: [
    {
      key: "employmentStatus",
      label: "Employment status",
      type: "multiselect",
      options: opts(employmentStatuses),
    },
    {
      key: "complianceStatus",
      label: "Compliance status",
      type: "multiselect",
      options: opts(complianceStatuses),
    },
    expandParam(["customFields", "complianceChecks", "reasonProvider", "user"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Personnel" },
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
    return new DrataClient(ctx).list(`/personnel`, {
      "employmentStatus[]": toList(input.employmentStatus),
      "complianceStatus[]": toList(input.complianceStatus),
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
