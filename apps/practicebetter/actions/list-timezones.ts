import type { ActionDefinition } from "@w6w/types";
import { PracticeBetterClient } from "../lib/client.ts";

/**
 * `GET /timezones` (`operationId: TimeZone_List`) — the time-zone vocabulary.
 *
 * Security: `[read]`. The response is a **bare array** of `{label, name,
 * tzName}` objects with no pagination envelope, so the action returns it
 * verbatim and declares the bare-array output key.
 *
 * `name` is the value this app's `create-session` (and any other resource that
 * expects a time zone) takes: the document says `name` is "the value to use when
 * creating or updating resources where a time zone is expected", while `label`
 * is for display and `tzName` is the IANA-style name.
 *
 * This is also the auth `test` probe — no path or query parameters, no client
 * data, minimal `read` scope, and a body that cannot contain a credential (see
 * `auth/client-credentials.ts`).
 */
const listTimezones: ActionDefinition<Record<string, never>, unknown[]> = {
  key: "list-timezones",
  type: "read",
  resource: "timezone",
  title: "List Timezones",
  description:
    "List Practice Better's time zones. Each entry's `name` is the value to send wherever a time " +
    "zone is expected, such as a session's `timeZone`.",
  params: [],
  output: [
    { key: "[]", type: "array", label: "Time zones — a bare array, not an envelope" },
  ],

  async execute(_input, ctx) {
    const zones = await new PracticeBetterClient(ctx).request<unknown[]>("/timezones");
    return Array.isArray(zones) ? zones : [];
  },
};

export default listTimezones;
