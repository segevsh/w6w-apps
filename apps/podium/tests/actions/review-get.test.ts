import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { API, mockCtx } from "../_helpers.ts";
import reviewGet from "../../actions/review-get.ts";

test("review-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewGet.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/reviews/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

test("review-get: declares its params and kind", () => {
  assertEquals((reviewGet.params ?? []).map((p) => p.key), ["uid"]);
  assertEquals((reviewGet.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(reviewGet.type, "read");
});
