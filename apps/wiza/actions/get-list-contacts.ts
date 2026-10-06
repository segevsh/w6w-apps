import type { ActionDefinition } from "@w6w/types";
import { WizaClient } from "../lib/client.ts";

interface Input {
  id: string | number;
  segment: "people" | "valid" | "risky";
}

const getListContacts: ActionDefinition<Input> = {
  key: "get-list-contacts",
  type: "read",
  resource: "list",
  title: "Get List Contacts",
  description:
    'Read the contacts of a list as JSON (GET /api/lists/{id}/contacts?segment=...). `segment` is required: people (all), valid (only valid emails) or risky. The response is not paginated in the reference. A list with nothing to export is HTTP 400 "No contacts to export" and fails the action.',
  params: [
    { key: "id", label: "List ID", type: "string", required: true },
    {
      key: "segment",
      label: "Segment",
      type: "select",
      required: true,
      default: "people",
      options: [
        { value: "people", label: "People — all contacts" },
        { value: "valid", label: "Valid — only valid emails" },
        { value: "risky", label: "Risky — only risky emails" },
      ],
    },
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts with email, title, company fields" }],

  async execute(input, ctx) {
    const id = String(input.id ?? "").trim();
    if (!/^\d+$/.test(id)) throw new Error("id must be the numeric list id");
    const segment = input.segment ?? "people";
    if (!["people", "valid", "risky"].includes(segment)) {
      throw new Error("segment must be people, valid or risky");
    }
    const body = await new WizaClient(ctx).call(`/api/lists/${id}/contacts`, {
      query: { segment },
    });
    return { contacts: Array.isArray(body.data) ? body.data : [] };
  },
};

export default getListContacts;
