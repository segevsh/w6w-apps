import { assertEquals, assertRejects } from "@std/assert";
import saleRevokeAccess from "../../actions/sale-revoke-access.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "saleId": "saleId-1==" };

Deno.test("sale-revoke-access: sends PUT /v2/sales/saleId-1%3D%3D/revoke_access with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "sale": { "id": "x1", "marker": true } },
  }]);
  await saleRevokeAccess.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/sales/saleId-1%3D%3D/revoke_access");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("sale-revoke-access: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "sale": { "id": "x1", "marker": true } } }]);
  assertEquals(await saleRevokeAccess.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("sale-revoke-access: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(saleRevokeAccess.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("sale-revoke-access: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(saleRevokeAccess.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
