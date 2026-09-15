import { assertEquals } from "@std/assert";
import clientUpdate from "../../actions/client-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-update - PATCHes /clients/{id} with the new name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { client_id: 2, name: "Acme Corp" } }]);
  const out = await clientUpdate.execute({ client_id: 2, name: "Acme Corp" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/clients/2");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme Corp" });
  assertEquals(out, { client_id: 2, name: "Acme Corp" });
});
