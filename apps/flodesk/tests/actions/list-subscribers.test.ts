import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";

import listSubscribers from "../../actions/list-subscribers.ts";

Deno.test("list-subscribers: GET /v1/subscribers with no query when unfiltered", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: { page: 1 }, data: [] } }]);
  await listSubscribers.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/subscribers");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-subscribers: maps status, segmentId and paging onto Flodesk's names", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await listSubscribers.execute(
    { status: "active", segmentId: "61b2", page: 2, perPage: 50 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("segment_id"), "61b2");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
});

Deno.test("list-subscribers: offers exactly Flodesk's six documented statuses", () => {
  const status = listSubscribers.params!.find((p) => p.key === "status")!;
  assertEquals(optionValues(status), [
    "active",
    "unsubscribed",
    "unconfirmed",
    "bounced",
    "complained",
    "cleaned",
  ]);
});

Deno.test("list-subscribers: returns the envelope verbatim", async () => {
  const body = { meta: { page: 1, total_pages: 3, per_page: 20, total_items: 45 }, data: [{}] };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await listSubscribers.execute({}, ctx), body);
});

// ------------------------------------------------------------- get ----------
