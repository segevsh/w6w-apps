import type { Param } from "@w6w/types";
import { compact, jsonObject, list, optString, unixTime } from "./client.ts";

/**
 * The receiver fields CleverReach documents for create and update (the "Example Post Data" on
 * `POST /groups/{group_id}/receivers` and `PUT /groups/{group_id}/receivers/{id}`).
 *
 * The Swagger body model is a `postdata` placeholder, but the example — and the wire — is the
 * receiver object itself, not wrapped in `postdata`.
 *
 * Be careful with the three timestamps (vendor wording): provide `registered` if the receiver is
 * new; provide `activated` only for immediate activation (no double-opt-in mail will work then);
 * a `deactivated` other than 0 makes the receiver inactive for good. Omitting all three on create
 * gives an ACTIVATED receiver.
 */
export const receiverFieldParams: Param[] = [
  { key: "source", label: "Source", type: "string", hint: 'Free text, e.g. "Website form".' },
  {
    key: "registered",
    label: "Registered at",
    type: "string",
    hint: "Unix timestamp (seconds) or ISO 8601. Set it for a new receiver.",
  },
  {
    key: "activated",
    label: "Activated at",
    type: "string",
    hint:
      "Unix timestamp or ISO 8601. ONLY to activate immediately — a double-opt-in mail will not work then. Omit to leave the receiver for DOI.",
  },
  {
    key: "deactivated",
    label: "Deactivated at",
    type: "string",
    hint:
      "Unix timestamp or ISO 8601. Omit unless you mean it: anything other than 0 makes the receiver inactive.",
  },
  {
    key: "attributes",
    label: "Group attributes",
    type: "json",
    hint: 'JSON object of this group\'s own attributes, e.g. `{"is_vip":"1"}`.',
  },
  {
    key: "globalAttributes",
    label: "Global attributes",
    type: "json",
    hint:
      'JSON object of account-wide attributes, e.g. `{"firstname":"Bruce","lastname":"Wayne"}`.',
  },
  {
    key: "tags",
    label: "Tags",
    type: "string",
    hint:
      "Comma-separated. Allowed characters are letters, digits, `_` and `-`; others become `_`. Prefix an origin with a period: `origin.tag`.",
  },
];

/** Map the action's params onto the receiver wire object. */
export function receiverBody(p: Record<string, unknown>): Record<string, unknown> {
  return compact({
    email: optString(p.email),
    source: optString(p.source),
    registered: unixTime(p.registered, "registered"),
    activated: unixTime(p.activated, "activated"),
    deactivated: unixTime(p.deactivated, "deactivated"),
    attributes: jsonObject(p.attributes, "attributes"),
    global_attributes: jsonObject(p.globalAttributes, "globalAttributes"),
    tags: list(p.tags),
  });
}
