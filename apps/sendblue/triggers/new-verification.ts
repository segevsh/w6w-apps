import verificationList from "../actions/verify-verification-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

const PAGE = 100;

/**
 * `GET /api/v2/verify/verifications` documents `limit`, `offset` and an `updated_at_gte` filter,
 * returns `data[]` plus `pagination.has_more`, and names no sort order
 * (https://docs.sendblue.com/api/resources/verify/subresources/verifications/methods/list/,
 * verified 2026-11-10). Each check asks for everything updated since the last check (minus a
 * two-minute overlap), pages with `offset` and keeps only verifications CREATED after the first
 * check (`date_created`), identified by `sid`.
 */
export default sinceTrigger({
  key: "new-verification",
  title: "New Verification",
  description: "The run gets each Verify verification newly started on your Sendblue account.",
  action: verificationList,
  pageSize: PAGE,
  input: ({ since }) => ({ updatedAtGte: since, limit: PAGE, offset: 0 }),
  nextPageInput: (input, result) => {
    const more = (result as { pagination?: { has_more?: boolean } } | null)?.pagination?.has_more;
    return more === true ? { ...input, offset: Number(input.offset ?? 0) + PAGE } : undefined;
  },
  items: (result) => {
    const data = (result as { data?: unknown } | null)?.data;
    return Array.isArray(data) ? data : [];
  },
  idOf: (item) => String((item as { sid?: unknown }).sid ?? ""),
  stampOf: (item) => (item as { date_created?: unknown }).date_created,
  output: [
    { key: "sid", type: "string", label: "Verification SID" },
    { key: "service_sid", type: "string", label: "Service SID" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "status", type: "string", label: "Status" },
    { key: "to", type: "string", label: "Recipient" },
    { key: "date_created", type: "string", label: "Created at" },
    { key: "date_updated", type: "string", label: "Updated at" },
  ],
  sample: {
    sid: "sample-verification-sid",
    service_sid: "sample-service-sid",
    channel: "sms",
    status: "pending",
    to: "+14155551234",
    date_created: "2026-11-10T09:00:00.000Z",
    date_updated: "2026-11-10T09:00:00.000Z",
  },
});
