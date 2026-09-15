import { assertEquals } from "@std/assert";
import clientDelete from "../../actions/client-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-delete - DELETEs /clients/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await clientDelete.execute({ client_id: 6 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/clients/6");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true, client_id: 6 });
});
