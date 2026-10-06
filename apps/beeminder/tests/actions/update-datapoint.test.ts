import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-datapoint.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("update-datapoint: PUTs only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc", value: 2, comment: "real" } }]);
  const out = await run(action, { slug: "w", id: "abc", comment: "real" }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints/abc.json",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, "comment=real");
  assertEquals(out.comment, "real");
});

Deno.test("update-datapoint: a missing id throws; errors surface", async () => {
  await assertRejects(() => run(action, { slug: "w" }, mockCtx().ctx), Error, "id is required");
  const bad = mockCtx([{ status: 404, body: { errors: "no point" } }]);
  await assertRejects(() => run(action, { slug: "w", id: "z" }, bad.ctx), Error, "no point");
});
