import subscriberList from "../actions/subscriber-list.ts";
import { newRecordSnapshot, productIdParam } from "../lib/triggers.ts";

/**
 * `GET /v2/products/:product_id/subscribers?paginated=true` returns at most 100 subscribers a
 * page, with `next_page_key` going back as `page_key` (https://gumroad.com/api, verified
 * 2026-11-10). The reference states no order and no created-since filter, so this is a snapshot of
 * the membership product's whole list (every page, bounded by `SNAPSHOT_MAX_PAGES`; a longer list
 * is a loud error), `added` only. It does not rely on an order.
 */
export default newRecordSnapshot<{ productId: string }>({
  key: "new-subscriber",
  title: "New Subscriber",
  description:
    "The run gets each new subscriber of a Gumroad membership product (the product's subscribers are re-read every check).",
  action: subscriberList,
  params: [productIdParam],
  input: ({ productId }) => ({ productId }),
  rows: (result) => (result as { subscribers?: unknown[] }).subscribers ?? [],
  next: (result) => (result as { nextPageKey?: string | null }).nextPageKey ?? undefined,
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "product_id", type: "string", label: "Product ID" },
    { key: "user_email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "GDzW4_aBdQc-o7Sh_-jRQw==",
    product_id: "A-m3CDDC5dlrSdKZp0RFhA==",
    product_name: "Monthly Membership",
    user_id: "G_-mnBf9b1j9A7a4ub4nFQ==",
    user_email: "buyer@example.com",
    purchase_ids: ["B28UrjXoNx5gFsBQ2UGhhA=="],
    created_at: "2026-11-05T19:38:56Z",
    ended_at: null,
    status: "alive",
  },
});
