import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-datapoints.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-datapoints: maps points and forwards sort/count/page/per", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", timestamp: 5, daystamp: "20090213", value: 7, comment: "", requestid: "a" }],
  }]);
  const out = await run(action, { slug: "w", sort: "timestamp", page: 2, per: 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints.json?sort=timestamp&page=2&per=10",
  );
  assertEquals(out.count, 1);
  assertEquals(out.datapoints[0].requestId, "a");
  assertEquals(out.datapoints[0].daystamp, "20090213");
});

Deno.test("list-datapoints: count=0 is kept; errors throw", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await run(action, { slug: "w", count: 0 }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints.json?count=0",
  );
  const bad = mockCtx([{ status: 404, body: { errors: "no goal" } }]);
  await assertRejects(() => run(action, { slug: "w" }, bad.ctx), Error, "no goal");
});
