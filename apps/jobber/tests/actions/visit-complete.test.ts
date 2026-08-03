import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/visit-complete.ts";

Deno.test("visit-complete: sends no input at all when the time is left to Jobber", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { visitComplete: { visit: { id: "v1", isComplete: true }, userErrors: [] } } },
  }]);
  await action.execute({ visitId: "v1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { visitId: "v1" });
});

Deno.test("visit-complete: a backdated completion is passed through", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { visitComplete: { visit: { id: "v1" }, userErrors: [] } } },
  }]);
  await action.execute({ visitId: "v1", completedAt: "2026-07-01T15:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    visitId: "v1",
    input: { completedAt: "2026-07-01T15:00:00Z" },
  });
});

Deno.test("visit-complete: never calls visitUncomplete", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { visitComplete: { visit: { id: "v1" }, userErrors: [] } } },
  }]);
  await action.execute({ visitId: "v1" }, ctx);
  assert(!JSON.parse(calls[0].body!).query.includes("visitUncomplete"));
});
