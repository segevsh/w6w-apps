import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import reviewSummaryList from "../../actions/review-summary-list.ts";

Deno.test("review-summary-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewSummaryList.execute(
    {
      "locationUids": "a1, b2",
      "userUid": "userUid-1",
      "createdAfter": "2026-10-01T00:00:00Z",
      "createdBefore": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews/summary");
  assertEquals(url.searchParams.getAll("locationUids[]"), ["a1", "b2"]);
  assertEquals(url.searchParams.get("userUid"), "userUid-1");
  assertEquals(url.searchParams.get("createdAt[gte]"), "2026-10-01T00:00:00Z");
  assertEquals(url.searchParams.get("createdAt[lte]"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 5);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("review-summary-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewSummaryList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews/summary");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("review-summary-list: declares its params and kind", () => {
  assertEquals((reviewSummaryList.params ?? []).map((p) => p.key), [
    "locationUids",
    "userUid",
    "createdAfter",
    "createdBefore",
  ]);
  assertEquals((reviewSummaryList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(reviewSummaryList.type, "read");
});
