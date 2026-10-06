import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-datapoint.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("delete-datapoint: DELETEs the point and returns it", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc", value: 2, daystamp: "20120729" } }]);
  const out = await run(action, { slug: "w", id: "abc" }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints/abc.json",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.id, "abc");
  assertEquals(out.daystamp, "20120729");
});

Deno.test("delete-datapoint: a missing id throws; errors surface", async () => {
  await assertRejects(() => run(action, { slug: "w" }, mockCtx().ctx), Error, "id is required");
  const bad = mockCtx([{ status: 404, body: { errors: "no point" } }]);
  await assertRejects(() => run(action, { slug: "w", id: "z" }, bad.ctx), Error, "no point");
});
