import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/test-list.ts";

/**
 * A bare call should mean "what is broken", not "everything including what
 * Vanta is still computing".
 */
Deno.test("test-list: defaults to the failures", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "t1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/tests");
  assertEquals(new URL(calls[0].url).searchParams.get("statusFilter"), "NEEDS_ATTENTION");
  assertEquals(result.count, 1);
});

/** Tests in rollout have no history and inflate a failure count. */
Deno.test("test-list: excludes upcoming tests unless asked", async () => {
  const hidden = mockCtx([page([])], { display });
  await action.execute!({}, hidden.ctx);
  assertEquals(new URL(hidden.calls[0].url).searchParams.get("isInRollout"), "false");

  const shown = mockCtx([page([])], { display });
  await action.execute!({ includeRollout: true }, shown.ctx);
  assertEquals(new URL(shown.calls[0].url).searchParams.get("isInRollout"), null);
});

Deno.test("test-list: any status sends no filter", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ statusFilter: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("statusFilter"), null);
});

Deno.test("test-list: framework, control and integration filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({
    frameworkFilter: "soc2",
    controlFilter: "ctrl_1",
    integrationFilter: "aws",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("frameworkFilter"), "soc2");
  assertEquals(q.get("controlFilter"), "ctrl_1");
  assertEquals(q.get("integrationFilter"), "aws");
});

Deno.test("test-list: reports a truncated walk", async () => {
  const { ctx } = mockCtx([page([{ id: "t1" }], { hasNextPage: true, endCursor: "c1" })], {
    display,
  });
  const result = await action.execute!({ limit: 1 }, ctx) as { hasNextPage: boolean };
  assertEquals(result.hasNextPage, true);
});

/** Three of the six statuses are not failures. */
Deno.test("test-list: says which status actually means broken", () => {
  assert(/NEEDS_ATTENTION/.test(action.description!), action.description);
  assert(/not failures/.test(action.description!), action.description);
});
