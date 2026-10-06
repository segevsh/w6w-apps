import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/refresh-graph.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("refresh-graph: GETs refresh_graph and maps true / false", async () => {
  const yes = mockCtx([{ body: "true" }]);
  assertEquals(await run(action, { slug: "run" }, yes.ctx), { queued: true });
  assertEquals(
    yes.calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/run/refresh_graph.json",
  );
  assertEquals(yes.calls[0].method, "GET");
  const no = mockCtx([{ body: "false" }]);
  assertEquals(await run(action, { slug: "run" }, no.ctx), { queued: false });
});

Deno.test("refresh-graph: errors throw", async () => {
  const bad = mockCtx([{ status: 404, body: { errors: "no goal" } }]);
  await assertRejects(() => run(action, { slug: "x" }, bad.ctx), Error, "no goal");
});
