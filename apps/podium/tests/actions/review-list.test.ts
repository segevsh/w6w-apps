import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import reviewList from "../../actions/review-list.ts";

Deno.test("review-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewList.execute(
    {
      "limit": 5,
      "cursor": "cursor-1",
      "createdAfter": "2026-10-01T00:00:00Z",
      "createdBefore": "2026-10-01T00:00:00Z",
      "updatedAfter": "2026-10-01T00:00:00Z",
      "updatedBefore": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("createdAt[gte]"), "2026-10-01T00:00:00Z");
  assertEquals(url.searchParams.get("createdAt[lte]"), "2026-10-01T00:00:00Z");
  assertEquals(url.searchParams.get("updatedAt[gte]"), "2026-10-01T00:00:00Z");
  assertEquals(url.searchParams.get("updatedAt[lte]"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 6);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("review-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("review-list: declares its params and kind", () => {
  assertEquals((reviewList.params ?? []).map((p) => p.key), [
    "limit",
    "cursor",
    "createdAfter",
    "createdBefore",
    "updatedAfter",
    "updatedBefore",
  ]);
  assertEquals((reviewList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(reviewList.type, "read");
});
