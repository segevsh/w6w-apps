import type { ActionDefinition } from "@w6w/types";
import { compact, SkyvernClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/browser_profiles` — saved browser profiles. */
interface Input {
  page?: number;
  pageSize?: number;
  searchKey?: string;
  managed?: string;
}

const browserProfileList: ActionDefinition<Input> = {
  key: "browser-profile-list",
  type: "search",
  resource: "browser-profile",
  title: "List Browser Profiles",
  description: "List saved browser profiles (persisted cookies and local storage).",
  params: [
    ...paginationParams(10),
    {
      key: "searchKey",
      label: "Search",
      type: "string",
      hint: "Case-insensitive substring across profile name and description.",
    },
    {
      key: "managed",
      label: "Managed profiles",
      type: "select",
      options: [
        { value: "false", label: "Only profiles I created" },
        { value: "true", label: "Only auto-managed profiles" },
      ],
      hint: "Leave empty for both.",
    },
  ],
  output: [
    { key: "browser_profiles", type: "array", label: "Profiles (browser_profile_id, name, …)" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const profiles = await new SkyvernClient(ctx).json<unknown[]>("/v1/browser_profiles", {
      query: compact({
        page: input.page,
        page_size: input.pageSize,
        search_key: input.searchKey,
        managed: input.managed,
      }),
    });
    return { browser_profiles: profiles ?? [], count: (profiles ?? []).length };
  },
};

export default browserProfileList;
