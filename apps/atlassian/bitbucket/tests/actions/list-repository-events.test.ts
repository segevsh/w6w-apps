import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-repository-events.ts";

test("list-repository-events: GETs /hook_events/repository", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/hook_events/repository");
  assertEquals(new URL(calls[0].url).searchParams.get("pagelen"), "100");
});

test("list-repository-events: forwards page + pagelen", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ page: 4, pagelen: 5 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("page"), "4");
  assertEquals(p.get("pagelen"), "5");
});
