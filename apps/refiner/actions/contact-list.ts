import type { ActionDefinition } from "@w6w/types";
import { compact, CURSOR_PARAM, PAGE_PARAMS, RefinerClient } from "../lib/client.ts";

interface Input {
  orderBy?: string;
  page?: number;
  pageLength?: number;
  pageCursor?: string;
  formUuid?: string;
  segmentUuid?: string;
  search?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts with their attributes, segments and account. For more than ~10,000 rows, " +
    "page with the cursor from `pagination.next_page_cursor` instead of page numbers.",
  params: [
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      default: "first_seen_at",
      options: [
        { value: "first_seen_at", label: "First seen" },
        { value: "last_seen_at", label: "Last seen" },
        { value: "last_form_submission_at", label: "Last survey submission" },
        { value: "display_name", label: "Name" },
        { value: "email", label: "Email" },
      ],
    },
    ...PAGE_PARAMS,
    CURSOR_PARAM,
    { key: "formUuid", label: "Survey UUID", type: "string", hint: "Only users linked to it." },
    { key: "segmentUuid", label: "Segment UUID", type: "string" },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches the contact's email, user id or name.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "pagination", type: "object", label: "Pagination block" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/contacts", {
      query: compact({
        order_by: input.orderBy,
        page: input.page,
        page_length: input.pageLength,
        page_cursor: input.pageCursor,
        form_uuid: input.formUuid,
        segment_uuid: input.segmentUuid,
        search: input.search,
      }),
    });
  },
};

export default contactList;
