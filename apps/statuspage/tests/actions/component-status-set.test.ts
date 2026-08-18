import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/component-status-set.ts";

const conn = { display: { pageId: "pg1" } };

Deno.test("component-status-set: PATCHes the component", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { id: "c1", status: "major_outage" } }],
    conn,
  );
  await action.execute!({ componentId: "c1", status: "major_outage" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/components/c1");
  assertEquals(JSON.parse(calls[0].body!), { component: { status: "major_outage" } });
});

Deno.test("component-status-set: an unknown status is refused with the options", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ componentId: "c1", status: "broken" }, ctx),
    Error,
    "operational",
  );
  assertEquals(calls.length, 0);
});

/** A red dot with no explanation is worse than the outage. */
Deno.test("component-status-set: says it notifies nobody", () => {
  assert(/notifies nobody|NO update/i.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
