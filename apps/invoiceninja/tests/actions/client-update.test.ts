import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/client-update.ts";

test("client-update: PUTs /clients/{id} with only the set fields", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "abc" } }]);
  await action.execute({ clientId: "abc", name: "New Name" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/clients/abc");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "New Name");
  assertEquals(body.phone, undefined);
});
