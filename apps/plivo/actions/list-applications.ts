import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";
import type { Page } from "../lib/params.ts";

interface Input extends Page {
  appName?: string;
  subaccount?: string;
}

/** `GET /v1/Account/{auth_id}/Application/` — applications on the account. */
const listApplications: ActionDefinition<Input> = {
  key: "list-applications",
  type: "read",
  resource: "application",
  title: "List Applications",
  description: "List the applications (Answer/Hangup/Message URL bundles) on the account.",
  params: [
    { key: "appName", label: "Name", type: "string", hint: "Filter by application name." },
    { key: "subaccount", label: "Subaccount Auth ID", type: "string" },
    ...PAGE_PARAMS,
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    {
      key: "meta",
      type: "object",
      label: "Pagination (limit, offset, total_count, next, previous)",
    },
    { key: "objects", type: "array", label: "Applications" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("Application/", {
      query: {
        app_name: input.appName,
        subaccount: input.subaccount,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listApplications;
