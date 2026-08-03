import type { ActionDefinition } from "@w6w/types";
import {
  FubClient,
  type FubList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  label?: string;
  sort?: string;
}

/**
 * `GET /customFields` — the account's contact custom fields.
 *
 * The lookup that makes the `customFields` param on Create Person, Update Person
 * and Create Event usable, because the two names a field has are not the same
 * name and only one of them works on the wire:
 *
 *   - `label` is what the field is called in the Follow Up Boss UI — "Close
 *     price".
 *   - `name` is what the API answers to — `customClosePrice`.
 *
 * The docs are explicit that the second is the one to send: "`name`: The name of
 * this custom field in API responses. This is also name you should use if you
 * wish to update a custom field on a person or send in a custom field with a new
 * lead", with the worked example "to send a value for a field named 'Close
 * Price', use the field name `customClosePrice`".
 *
 * Each field also reports a `type` — one of `text`, `date`, `number`,
 * `dropdown` — plus `choices` for dropdowns ("this list of choices are the only
 * valid values") and `isRecurring` for dates, which distinguishes a birthday or
 * anniversary from a one-off closing date.
 *
 * Note this covers **people** custom fields only. Deals have a separate
 * namespace behind `/dealCustomFields`.
 *
 * Watch the response key: the collection comes back as `customfields`,
 * lower-cased, not `customFields`. `lib/client.ts` handles that centrally — see
 * its module comment.
 */
const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the account's contact custom fields. Use the `name` from here (e.g. " +
    "`customClosePrice`) when writing custom values — not the UI `label` (e.g. 'Close price'). " +
    "Dropdowns report their permitted `choices`. Deal custom fields live elsewhere, under " +
    "`/dealCustomFields`.",
  params: [
    {
      key: "label",
      label: "Label",
      type: "string",
      hint: "Find one custom field by its UI label.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: [
        { value: "id", label: "Id" },
        { value: "name", label: "Name" },
        { value: "orderWeight", label: "Order weight" },
      ],
      hint: "Prefix with `-` for descending. Defaults to `id` descending.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/customFields", {
      query: { ...pageQuery(input), label: input.label, sort: input.sort },
    });
  },
};

export default listCustomFields;
