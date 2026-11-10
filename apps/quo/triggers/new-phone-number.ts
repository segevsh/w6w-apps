import type { TriggerDefinition } from "@w6w/types";
import phoneNumberList from "../actions/phone-number-list.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /v1/phone-numbers` returns every number of the workspace in one unpaginated response
 * (the OpenAPI `ListPhoneNumbersResponse` has only `data`) — a small bounded collection. Every
 * check reads it through `phone-number-list` and diffs the ids.
 * https://www.quo.com/docs/mdx/api-reference/phone-numbers/list-phone-numbers (verified 2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-phone-number",
  title: "New Phone Number",
  description: "The run gets each phone number newly added to your Quo workspace.",
  output: [
    { key: "id", type: "string", label: "Phone number ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "number", type: "string", label: "Number (E.164)" },
    { key: "formattedNumber", type: "string", label: "Formatted number" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "PN123abc",
    name: "Sales",
    number: "+15555555555",
    formattedNumber: "(555) 555-5555",
    createdAt: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await phoneNumberList.execute({}, ctx) as { data?: unknown[] };
    return newRecords({
      state,
      items: res.data ?? [],
      idOf: (p) => (p as { id?: unknown }).id,
    });
  },
};

export default trigger;
