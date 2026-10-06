import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import reviewResponseCreate from "../../actions/review-response-create.ts";

Deno.test("review-response-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await reviewResponseCreate.execute(
    { "uid": "uid-1", "body": "body text" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/reviews/uid-1/responses");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), { "body": "body text" });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("review-response-create: declares its params and kind", () => {
  assertEquals((reviewResponseCreate.params ?? []).map((p) => p.key), ["uid", "body"]);
  assertEquals((reviewResponseCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "uid",
    "body",
  ]);
  assertEquals(reviewResponseCreate.type, "perform");
  assertEquals(reviewResponseCreate.idempotent, false);
});
