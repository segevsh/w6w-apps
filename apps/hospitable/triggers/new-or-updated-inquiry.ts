import type { Param } from "@w6w/types";
import { sinceFeed } from "../lib/triggers.ts";
import inquiryList from "../actions/inquiry-list.ts";

const PROPERTY_IDS: Param = {
  key: "propertyIds",
  label: "Property UUIDs",
  type: "text",
  required: true,
  hint: "One or more property UUIDs (from List Properties), comma or newline separated.",
};

export default sinceFeed({
  key: "new-or-updated-inquiry",
  title: "New or Updated Inquiry",
  description:
    "The run gets each pre-booking inquiry that is new or has a new message since the last check.",
  action: inquiryList as never,
  stamp: "last_message_at",
  params: [PROPERTY_IDS],
  input: ({ params, since, page, pageSize }) => ({
    property_ids: params.propertyIds,
    last_message_at: since,
    page,
    per_page: pageSize,
  }),
  idOf: (item) => `${String(item.id ?? "")}:${String(item.last_message_at ?? "")}`,
  output: [
    { key: "id", type: "string", label: "Inquiry ID" },
    { key: "last_message_at", type: "string", label: "Last message at" },
    { key: "guest", type: "object", label: "Guest" },
  ],
  sample: {
    id: "inquiry-1",
    last_message_at: "2026-11-10T09:30:00Z",
    guest: { first_name: "Mia" },
  },
});
