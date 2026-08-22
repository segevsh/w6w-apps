import type { ActionDefinition } from "@w6w/types";
import { FrontClient, unixSeconds } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /contacts` — verified against Front's own OpenAPI document
 * (`list-contacts`).
 *
 * A Front contact is **the person behind the handles**, not one address: an
 * email, a phone number and a Twitter account can all belong to one contact,
 * and that is what makes a shared inbox able to show one history per customer
 * across channels.
 *
 * The only filter Front offers here is a **time window** — `q[updated_after]`
 * and `q[updated_before]`, in Unix seconds with up to three decimal places.
 * There is no name or email filter on this route, which is why a sync reads
 * incrementally by `updated_after` rather than searching. Looking a person up
 * by address is done by fetching the handle alias directly (`contact-get` with
 * `alt:email:…`).
 */
const action: ActionDefinition = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List contacts",
  description:
    "Contacts, optionally only those changed inside a time window — the incremental-sync " +
    "filter, since Front offers no name or email filter here.",
  params: [
    {
      key: "updatedAfter",
      label: "Updated After",
      type: "datetime",
      default: "",
      hint: "Only contacts changed since this moment. The filter an incremental sync uses.",
    },
    {
      key: "updatedBefore",
      label: "Updated Before",
      type: "datetime",
      default: "",
      advanced: true,
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "handles", type: "array", label: "Handles" },
    { key: "description", type: "string", label: "Description" },
    { key: "updated_at", type: "number", label: "Updated At" },
    { key: "custom_fields", type: "object", label: "Custom Fields" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new FrontClient(ctx).requestAll("/contacts", {
      q: {
        updated_after: unixSeconds(p.updatedAfter, "updatedAfter"),
        updated_before: unixSeconds(p.updatedBefore, "updatedBefore"),
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
