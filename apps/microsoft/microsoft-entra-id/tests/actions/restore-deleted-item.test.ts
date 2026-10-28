import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/restore-deleted-item.ts";

Deno.test("restore-deleted-item: POSTs /directory/deletedItems/{id}/restore with no body by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { "@odata.type": "#microsoft.graph.user", id: "u1" } }]);
  const out = await action.execute({ itemId: "u1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/directory/deletedItems/u1/restore");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "u1");
});

Deno.test("restore-deleted-item: sends the documented user-only options when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await action.execute({
    itemId: "u1",
    newUserPrincipalName: "new@contoso.com",
    autoReconcileProxyConflict: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    newUserPrincipalName: "new@contoso.com",
    autoReconcileProxyConflict: true,
  });
});

Deno.test("restore-deleted-item: a purged item is Graph's 404, surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "Request_ResourceNotFound", message: "not in deleted items" } },
  }]);
  await assertRejects(
    async () => await action.execute({ itemId: "u9" }, ctx),
    Error,
    "Request_ResourceNotFound",
  );
});
