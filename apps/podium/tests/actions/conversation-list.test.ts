import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import conversationList from "../../actions/conversation-list.ts";

Deno.test("conversation-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await conversationList.execute(
    {
      "limit": 5,
      "cursor": "cursor-1",
      "locationUid": "locationUid-1",
      "order": "asc",
      "since": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/conversations");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("locationUid"), "locationUid-1");
  assertEquals(url.searchParams.get("order"), "asc");
  assertEquals(url.searchParams.get("since"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 5);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("conversation-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await conversationList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/conversations");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("conversation-list: declares its params and kind", () => {
  assertEquals((conversationList.params ?? []).map((p) => p.key), [
    "limit",
    "cursor",
    "locationUid",
    "order",
    "since",
  ]);
  assertEquals((conversationList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(conversationList.type, "read");
});
