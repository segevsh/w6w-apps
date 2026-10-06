import type { ActionDefinition } from "@w6w/types";
import { DubClient, strList } from "../lib/client.ts";

interface Input {
  domain?: string;
  tagIds?: string[] | string;
  tagNames?: string[] | string;
  folderId?: string;
  search?: string;
  userId?: string;
  tenantId?: string;
  showArchived?: boolean;
}

/** `GET /links/count` — documented to answer a bare number. `groupBy` is not exposed. */
const linkCount: ActionDefinition<Input> = {
  key: "link-count",
  type: "read",
  resource: "link",
  title: "Count Links",
  description: "Count the short links in the workspace that match the filters.",
  params: [
    { key: "domain", label: "Domain", type: "string" },
    { key: "search", label: "Search", type: "string" },
    { key: "tagIds", label: "Tag IDs", type: "array", item: { type: "string" } },
    { key: "tagNames", label: "Tag names", type: "array", item: { type: "string" } },
    { key: "folderId", label: "Folder ID", type: "string" },
    { key: "userId", label: "User ID", type: "string" },
    { key: "tenantId", label: "Tenant ID", type: "string" },
    { key: "showArchived", label: "Include archived", type: "boolean" },
  ],
  output: [{ key: "count", type: "number", label: "Number of matching links" }],

  async execute(input, ctx) {
    const count = await new DubClient(ctx).request<number>("GET", "/links/count", {
      query: {
        domain: input.domain,
        search: input.search,
        tagIds: strList(input.tagIds),
        tagNames: strList(input.tagNames),
        folderId: input.folderId,
        userId: input.userId,
        tenantId: input.tenantId,
        showArchived: input.showArchived,
      },
    });
    return { count };
  },
};

export default linkCount;
