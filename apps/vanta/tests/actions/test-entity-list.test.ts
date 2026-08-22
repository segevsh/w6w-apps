import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/test-entity-list.ts";

/** The call that turns a red light into something a workflow can act on. */
Deno.test("test-entity-list: returns the resources actually failing", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "e1" }, { id: "e2" }])], { display });
  const result = await action.execute!({ testId: "t1" }, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/tests/t1/entities");
  assertEquals(result.count, 2);
});

Deno.test("test-entity-list: pages to the end when asked", async () => {
  const { ctx, calls } = mockCtx([
    page([{ id: "e1" }], { hasNextPage: true, endCursor: "c1" }),
    page([{ id: "e2" }]),
  ], { display });
  const result = await action.execute!({ testId: "t1", returnAll: true }, ctx) as {
    count: number;
    hasNextPage: boolean;
  };
  assertEquals(calls.length, 2);
  assertEquals(result.count, 2);
  assertEquals(result.hasNextPage, false);
});

Deno.test("test-entity-list: logs counts only", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "e1", displayName: "prod-db" }])], { display });
  await action.execute!({ testId: "t1" }, ctx);
  assertEquals(logs[0].data, { testId: "t1", count: 1 });
});

Deno.test("test-entity-list: needs a test id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "testId");
  assertEquals(calls.length, 0);
});
