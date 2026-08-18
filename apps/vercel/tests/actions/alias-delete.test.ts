import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias-delete.ts";

Deno.test("alias-delete: DELETEs the alias", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "SUCCESS" } }], { display: {} });
  const result = await action.execute!({ aliasId: "al_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v2/aliases/al_1");
  assertEquals(result, { status: "SUCCESS" });
});

Deno.test("alias-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`aliasId`");
  assertEquals(calls.length, 0);
});
