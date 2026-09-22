import type { ActionDefinition } from "@w6w/types";

import { API_BASE, applyQuery, sendJson } from "../lib/client.ts";

/**
 * `GET /organizations` — the organization list.
 *
 * `q` is the name search, `organization_segment` filters by the organization's
 * segment and `user_id` by its owner. The response is the vendor's own
 * `{ organizations, has_more, total }` envelope, returned verbatim, and only the
 * first **10,000** records are reachable across pages.
 *
 * A token whose visibilidade for empresas is Restrito sees only what its owner
 * sees, so `total` here is that subset — not the account's whole book of
 * business.
 */
interface Input {
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
  organizationSegment?: string;
  userId?: string;
  q?: string;
}

const listOrganizations: ActionDefinition<Input> = {
  key: "list-organizations",
  type: "search",
  resource: "organization",
  title: "List Organizations",
  description: "List CRM organizations with the documented paging, ordering and filters.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Only the first 10,000 records of the list are reachable at all.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      default: 20,
      hint: "The API's default is 20 and its maximum is 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "order",
      label: "Order by",
      type: "string",
      placeholder: "created_at",
      hint: "Field to sort on, as the API names it.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "q",
      label: "Name search",
      type: "string",
      hint: "Free-text search over the organization's name.",
    },
    {
      key: "organizationSegment",
      label: "Segment",
      type: "string",
      hint: "Filter by the organization's segment, as your account spells it.",
    },
    {
      key: "userId",
      label: "Owner user ID",
      type: "string",
      hint: "Filter by the owning user's `id`, from List Users.",
    },
  ],
  output: [
    { key: "organizations", type: "array", label: "Organizations on this page" },
    { key: "has_more", type: "boolean", label: "Whether another page is reachable" },
    { key: "total", type: "number", label: "Records visible to this token" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/organizations`);
    applyQuery(url, {
      page: input.page,
      limit: input.limit,
      order: input.order,
      direction: input.direction,
      organization_segment: input.organizationSegment,
      user_id: input.userId,
      q: input.q,
    });
    return sendJson(ctx, url);
  },
};

export default listOrganizations;
