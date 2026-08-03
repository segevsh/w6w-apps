import type { ActionDefinition } from "@w6w/types";
import {
  FlodeskClient,
  type FlodeskList,
  PAGE_OUTPUT,
  type PageInput,
  WORKFLOW_PAGE_PARAMS,
} from "../lib/client.ts";

interface Input extends PageInput {
  statuses?: string[];
}

/**
 * `GET /v1/workflows`.
 *
 * Two things about this endpoint are inconsistent with the rest of the API and
 * are reproduced exactly rather than tidied up:
 *
 *   1. Its per-page parameter is **`perPage`**, not `per_page`. Every other list
 *      endpoint uses snake_case. Sending `per_page` here would be silently
 *      ignored.
 *   2. Its default page size is **10**, not 20.
 *
 * `statuses` is a comma-joined list ("e.g. statuses=active,paused"), documented
 * as defaulting to all statuses. The enum is `active`, `paused`, `draft`.
 *
 * The response is `{ data, meta }` where each workflow carries only `id` and
 * `name` — Flodesk publishes no richer workflow schema, and no endpoint to
 * create, edit, start, pause or delete a workflow.
 */
const listWorkflows: ActionDefinition<Input> = {
  key: "list-workflows",
  type: "search",
  resource: "workflow",
  title: "List Workflows",
  description:
    "List workflows, optionally filtered by status. Each carries `id` and `name` only — Flodesk publishes no other workflow fields and no way to create or modify one.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      hint: "Omit for all statuses.",
      options: [
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "draft", label: "Draft" },
      ],
    },
    ...WORKFLOW_PAGE_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Workflows" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request<FlodeskList>("/workflows", {
      query: {
        statuses: input.statuses?.length ? input.statuses.join(",") : undefined,
        page: input.page,
        // camelCase, deliberately — see the note above.
        perPage: input.perPage,
      },
    });
  },
};

export default listWorkflows;
