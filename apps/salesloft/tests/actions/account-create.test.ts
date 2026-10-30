import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-create.ts";

test("account-create: POSTs /accounts with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const result = await action.execute!({ name: "Acme", domain: "acme.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/accounts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Acme");
  assertEquals(body.domain, "acme.com");
  assertEquals(result, { data: { id: 1 } });
});

test("account-create: merges additionalFields into the payload", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await action.execute!({ name: "Acme", additionalFields: { size: "51-200" } }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.size, "51-200");
});
