import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rate-video.ts";

Deno.test("rate-video: POSTs /youtube/v3/videos/rate with id and rating, no part", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "v1", rating: "like" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/youtube/v3/videos/rate");
  assertEquals(url.searchParams.get("id"), "v1");
  assertEquals(url.searchParams.get("rating"), "like");
  assertEquals(url.searchParams.get("part"), null);
  assertEquals(out, { rated: true, rating: "like" });
});

Deno.test("rate-video: rating `none` is the removal operation", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "v1", rating: "none" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("rating"), "none");
  assertEquals(out, { rated: true, rating: "none" });
});

Deno.test("rate-video: offers exactly the three documented ratings", () => {
  const rating = action.params!.find((p) => p.key === "rating");
  assertEquals((rating!.options as Array<{ value: string }>).map((o) => o.value), [
    "like",
    "dislike",
    "none",
  ]);
  assert(!action.params!.some((p) => p.key === "part"));
  assertEquals(action.idempotent, true);
});
