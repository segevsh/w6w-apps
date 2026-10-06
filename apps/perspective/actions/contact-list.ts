import type { ActionDefinition } from "@w6w/types";
import { encodeId, PerspectiveClient, requireString } from "../lib/client.ts";
import type { PerspectiveMeta } from "../lib/client.ts";
import { contactSortFieldOptions, funnelIdParam } from "../lib/params.ts";

/**
 * `GET /v1/funnels/{funnelId}/contacts` — one page of a funnel's CRM contacts.
 *
 * Pages are 0-based (`page=1` is the SECOND page). The response `meta.hasNext`
 * says whether to ask for `page + 1`.
 */
interface Input {
  funnelId: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string | number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List a funnel's CRM contacts, one page at a time (pages start at 0).",
  params: [
    funnelIdParam,
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      hint: "0-based: 0 is the first page.",
      validation: { min: 0, integer: true },
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 50,
      hint: "1 to 100 contacts per page.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      options: contactSortFieldOptions,
      default: "ps_converted_at",
    },
    {
      key: "sortOrder",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "-1", label: "Descending (newest first)" },
        { value: "1", label: "Ascending" },
      ],
      default: "-1",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Contacts on this page" },
    {
      key: "meta",
      type: "object",
      label: "Pagination",
    },
  ],

  async execute(input, ctx) {
    const funnelId = requireString(input.funnelId, "funnelId");
    const page = input.page ?? 0;
    const limit = input.limit ?? 50;
    if (!Number.isInteger(page) || page < 0) throw new Error("page must be an integer >= 0");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("limit must be an integer from 1 to 100");
    }
    const sortOrder = input.sortOrder === undefined ? undefined : String(input.sortOrder);
    if (sortOrder !== undefined && sortOrder !== "-1" && sortOrder !== "1") {
      throw new Error("sortOrder must be -1 or 1");
    }
    const body = await new PerspectiveClient(ctx).request<
      { data: unknown[]; meta: PerspectiveMeta }
    >(`/funnels/${encodeId(funnelId)}/contacts`, {
      query: { page, limit, sortField: input.sortField, sortOrder },
    });
    return { data: body.data, meta: body.meta };
  },
};

export default contactList;
