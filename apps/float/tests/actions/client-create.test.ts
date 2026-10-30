import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import clientCreate from "../../actions/client-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("client-create - POSTs /clients with the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { client_id: 2, name: "Acme" } }]);
  const out = await clientCreate.execute({ name: "Acme" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/clients");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
  assertEquals(out, { client_id: 2, name: "Acme" });
});
