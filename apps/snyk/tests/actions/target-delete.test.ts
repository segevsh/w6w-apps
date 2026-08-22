import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/target-delete.ts";

/** Deleting a target takes every project under it. */
Deno.test("target-delete: DELETEs and reports what went", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: { orgId: "org-1" } });
  const result = await action.execute!({ targetId: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/targets/t1");
  assertEquals(result, { id: "t1", deleted: true });
});

Deno.test("target-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { orgId: "org-1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`targetId`");
  assertEquals(calls.length, 0);
});
