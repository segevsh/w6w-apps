import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-goal.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("update-goal: PUTs only the given fields as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "run", title: "New", secret: true } }]);
  const out = await run(action, { slug: "run", title: "New", secret: true }, ctx);
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/users/me/goals/run.json");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { title: "New", secret: true });
  assertEquals(out.title, "New");
});

Deno.test("update-goal: roadall (array or JSON string) and tags (empty clears) are sent as arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const road = [[1700000000, 0, null], [null, 10, 1]];
  await run(action, { slug: "g", roadall: JSON.stringify(road), tags: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { roadall: road, tags: [] });
  await run(action, { slug: "g", roadall: road, datasource: "" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { roadall: road, datasource: "" });
});

Deno.test("update-goal: errors surface", async () => {
  const bad = mockCtx([{ status: 400, body: { errors: "makes the goal easier" } }]);
  await assertRejects(() => run(action, { slug: "g" }, bad.ctx), Error, "makes the goal easier");
});
