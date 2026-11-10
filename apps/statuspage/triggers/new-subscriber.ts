import { pollFromListAction } from "../../_shared/poll/mod.ts";
import subscriberList from "../actions/subscriber-list.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * `GET /pages/{page_id}/subscribers` documents `sort_field=created_at` with `sort_direction=desc`,
 * a zero-based `page` and `limit` (https://developer.statuspage.io/#operation/getPagesPageIdSubscribers).
 * `subscriber-list` with `newestFirst` makes exactly that request. `state=all` so a subscriber is
 * seen as soon as it exists (an email subscriber is `unconfirmed` until the address is confirmed,
 * and the vendor's default is `active` only).
 */
export default pollFromListAction<{ pageId?: string }>({
  key: "new-subscriber",
  title: "New Subscriber",
  description: "The run gets each newly created status page subscriber, in any state.",
  action: subscriberList,
  params: [PAGE_PARAM],
  input: (params) => ({
    newestFirst: true,
    state: "all",
    limit: 100,
    ...(params?.pageId ? { pageId: params.pageId } : {}),
  }),
  items: (result) => (result as { subscribers?: unknown[] }).subscribers ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "mode", type: "string", label: "Type" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "sample-subscriber-id",
    mode: "email",
    email: "ada@example.com",
    created_at: "2026-11-09T14:08:41.000Z",
  },
  maxPages: 1,
});
