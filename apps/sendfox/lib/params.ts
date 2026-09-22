import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the SendFox actions.
 *
 * Every enum here is copied from SendFox's OpenAPI document (fetched
 * 2026-09-22 from `https://sendfox.com/openapi.yaml`), not inferred.
 */

/**
 * `ContactFilter.status` — the engagement statuses `GET /contacts` accepts.
 *
 * The values are the vendor's; the labels say what each one means, which the
 * bare one-word value does not ("inactive" is especially easy to read the wrong
 * way — it is an engagement bucket, not "unsubscribed").
 */
export const contactStatusOptions = [
  { value: "active", label: "Active — reachable and engaged" },
  { value: "engaged", label: "Engaged — recently opened or clicked" },
  { value: "inactive", label: "Inactive — not recently engaged" },
  { value: "new", label: "New" },
  { value: "unconfirmed", label: "Unconfirmed — pending double opt-in" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "bounced", label: "Bounced" },
  { value: "invalid", label: "Invalid address" },
];

/**
 * `per_page` for `GET /contacts`, the only SendFox list that documents one.
 *
 * 1–1000 with a vendor default of 100. This app leaves the default at the
 * vendor's own 100 rather than prefilling something smaller: a contact page is
 * the point of the call, and 100 rows of `{id, email, ...}` is not the
 * multi-megabyte footgun Apify's `limit: 1000` default is.
 */
export const perPageParam: Param = {
  key: "perPage",
  label: "Per page",
  type: "number",
  default: 100,
  validation: { integer: true, min: 1, max: 1000 },
  hint: "Contacts per page (1–1000). SendFox's default and this action's are both 100.",
};

/**
 * The `filter[...]` engagement set, as a collapsible section.
 *
 * `GET /contacts` is the one list endpoint SendFox gives a real filter grammar,
 * and it is worth exposing in full: these filters are how a workflow asks "who
 * opened nothing in the last year" without paging the whole account. All
 * conditions are AND-ed, per the document.
 *
 * The param keys are camelCase identifiers and the API's own names
 * (`filter[last_opened_after]`, …) are mapped at the call site, because a
 * bracketed key is not a valid `Param.key`. `inListIds` and friends use the
 * document's default array serialization — a repeated `filter[...]` key — see
 * `lib/client.ts`.
 */
export function contactFilterSection(): Param {
  const dateTime = (key: string, label: string, hint: string): Param => ({
    key,
    label,
    type: "datetime",
    hint,
  });
  const never = (key: string, label: string): Param => ({
    key,
    label,
    type: "boolean",
    hint: "Leave empty to include everyone; turn on to restrict to contacts who never did this.",
  });
  const idList = (key: string, label: string, hint: string): Param => ({
    key,
    label,
    type: "array",
    item: { type: "number", placeholder: "42" },
    hint,
  });

  return {
    key: "filters",
    label: "Engagement filters",
    type: "section",
    section: "collapsible",
    title: "Engagement filters",
    subtitle: "Status, recency, and never-opened/clicked/sent — all conditions are AND-ed",
    collapsed: true,
    children: [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: contactStatusOptions,
        hint: "Engagement bucket. Leave empty for any status.",
      },
      dateTime(
        "lastOpenedAfter",
        "Last opened on or after",
        "Contacts whose most recent open is on or after this instant.",
      ),
      dateTime(
        "lastOpenedBefore",
        "Last opened before",
        "Contacts whose most recent open is before this instant. Excludes contacts who never " +
          "opened — use the never-opened toggle for those.",
      ),
      dateTime(
        "lastClickedAfter",
        "Last clicked on or after",
        "Contacts whose most recent link click is on or after this instant.",
      ),
      dateTime(
        "lastClickedBefore",
        "Last clicked before",
        "Contacts whose most recent link click is before this instant.",
      ),
      dateTime(
        "lastSentAfter",
        "Last sent on or after",
        "Contacts last emailed on or after this instant.",
      ),
      dateTime(
        "lastSentBefore",
        "Last sent before",
        "Contacts last emailed before this instant.",
      ),
      dateTime(
        "createdAfter",
        "Created on or after",
        "Contacts created on or after this instant.",
      ),
      dateTime("createdBefore", "Created before", "Contacts created before this instant."),
      never("neverOpened", "Never opened"),
      never("neverClicked", "Never clicked a link"),
      never("neverSent", "Never sent an email"),
      idList(
        "inListIds",
        "In any of these lists",
        "Only contacts who are in at least one of these list ids.",
      ),
      idList(
        "notInListIds",
        "Not in any of these lists",
        "Exclude contacts who are in any of these list ids.",
      ),
      idList(
        "tagIds",
        "Carrying any of these tags",
        "Only contacts carrying at least one of these tag ids.",
      ),
      idList(
        "notTagIds",
        "Not carrying any of these tags",
        "Exclude contacts carrying any of these tag ids.",
      ),
    ],
  };
}

/** A path id param. SendFox addresses every resource by integer id. */
export function idParam(key: string, label: string, hint: string): Param {
  return {
    key,
    label,
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint,
  };
}
