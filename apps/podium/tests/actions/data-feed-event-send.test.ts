import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import dataFeedEventSend from "../../actions/data-feed-event-send.ts";

Deno.test("data-feed-event-send: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await dataFeedEventSend.execute(
    { "uid": "uid-1", "event": { "k": "v" } } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/dataFeeds/uid-1/events");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), { "k": "v" });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { accepted: true });
});

Deno.test("data-feed-event-send: declares its params and kind", () => {
  assertEquals((dataFeedEventSend.params ?? []).map((p) => p.key), ["uid", "event"]);
  assertEquals((dataFeedEventSend.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "uid",
    "event",
  ]);
  assertEquals(dataFeedEventSend.type, "perform");
  assertEquals(dataFeedEventSend.idempotent, false);
});
