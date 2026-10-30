import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/client-update.ts";

test("client-update: PUTs /users/clients/{clientId} with the fields envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { client: {} } } } }]);
  await action.execute({ clientId: "c1", fields: { organization: "Acme" } }, ctx);
  assertEquals(calls[0].url, "https://api.freshbooks.com/accounting/account/acc1/users/clients/c1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { client: { organization: "Acme" } });
});

test("client-update: accepts fields as a JSON string", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: {} }]);
  await action.execute({ clientId: "c1", fields: '{"note":"VIP"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { client: { note: "VIP" } });
});
