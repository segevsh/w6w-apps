import type { Param } from "@w6w/types";

/** `page` / `limit` per https://docs.sayanchor.com/reference/pagination-filtering (1-based, max 100). */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "1-based page number. Defaults to 1.",
};

export const limitParam: Param = {
  key: "limit",
  label: "Page size",
  type: "number",
  validation: { integer: true, min: 1, max: 100 },
  hint: "Items per page, 1-100. Anchor's default and maximum are both 100.",
};

export const searchParam: Param = {
  key: "search",
  label: "Search",
  type: "string",
  hint: "Free-text search across the resource's name, client and related fields.",
};

export const WEBHOOK_EVENTS = [
  "*",
  "proposal.*",
  "proposal.sent",
  "proposal.published",
  "proposal.reviewed",
  "proposal.approved",
  "proposal.expired",
  "proposal.withdrawn",
  "agreement.*",
  "agreement.amended",
  "agreement.amendments_approved",
  "agreement.terminated",
  "payout.*",
  "payout.paid",
  "payout.failed",
  "payout.deleted",
  "invoice.*",
  "invoice.issued",
  "invoice.paid",
  "invoice.payment_initiated",
  "invoice.payment_collected",
  "invoice.payment_failed",
  "invoice.payment_refunded",
  "invoice.payment_partially_refunded",
  "invoice.payment_refund_failed",
  "invoice.payment_disputed",
  "invoice.voided",
] as const;
