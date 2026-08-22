import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-delete.ts";

Deno.test("asset-delete: refuses without confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({ assetId: "a1" }, ctx), Error);
  assert(/stored master/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("asset-delete: confirmed, it deletes", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ assetId: "a1", confirm: true }, ctx), {
    ok: true,
    assetId: "a1",
  });
  assertEquals(calls[0].method, "DELETE");
});

/** A retention job is exactly the thing that deletes the wrong list. */
Deno.test("asset-delete: frames itself as a cost-control operation", () => {
  assert(/storage cost/i.test(action.description!), action.description);
});
