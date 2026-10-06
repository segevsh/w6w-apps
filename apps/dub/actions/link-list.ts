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
  pageSize?: number;
  startingAfter?: string;
  endingBefore?: string;
}

/**
 * `GET /links` — cursor pagination. The `page` parameter is marked DEPRECATED
 * in the reference ("Use `startingAfter` instead"), so this action does not
 * expose it.
 */
const linkList: ActionDefinition<Input> = {
  key: "link-list",
  type: "search",
  resource: "link",
  title: "List Links",
  description:
    "List short links, newest first, one cursor page at a time. Pass `nextCursor` from the result as `startingAfter` for the next page.",
  params: [
    { key: "domain", label: "Domain", type: "string", hint: "Only links on this domain." },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches the slug and destination URL.",
    },
    { key: "tagIds", label: "Tag IDs", type: "array", item: { type: "string" } },
    { key: "tagNames", label: "Tag names", type: "array", item: { type: "string" } },
    { key: "folderId", label: "Folder ID", type: "string" },
    { key: "userId", label: "User ID", type: "string" },
    { key: "tenantId", label: "Tenant ID", type: "string" },
    { key: "showArchived", label: "Include archived", type: "boolean" },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Defaults to 100, the maximum.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "startingAfter",
      label: "Starting after (cursor)",
      type: "string",
      hint: "A link ID: return links after it.",
    },
    {
      key: "endingBefore",
      label: "Ending before (cursor)",
      type: "string",
      hint: "A link ID: return links before it. Exclusive with `startingAfter`.",
    },
  ],
  output: [
    { key: "links", type: "array", label: "Links on this page" },
    {
      key: "nextCursor",
      type: "string",
      label: "ID to pass as startingAfter; absent when the page was not full",
    },
  ],

  async execute(input, ctx) {
    const links = await new DubClient(ctx).request<Array<{ id?: string }>>("GET", "/links", {
      query: {
        domain: input.domain,
        search: input.search,
        tagIds: strList(input.tagIds),
        tagNames: strList(input.tagNames),
        folderId: input.folderId,
        userId: input.userId,
        tenantId: input.tenantId,
        showArchived: input.showArchived,
        pageSize: input.pageSize,
        startingAfter: input.startingAfter,
        endingBefore: input.endingBefore,
      },
    });
    const size = input.pageSize ?? 100;
    const last = links.at(-1)?.id;
    return { links, ...(links.length >= size && last ? { nextCursor: last } : {}) };
  },
};

export default linkList;
