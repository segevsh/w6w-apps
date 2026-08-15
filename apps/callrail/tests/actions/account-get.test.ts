import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-get: fetches /v3/a/{account_id}.json and returns the object as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ACC1", name: "Acme", hipaa_account: false } }]);
  const out = await accountGet.execute({ accountId: "ACC1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1.json");
  assertEquals(out, { id: "ACC1", name: "Acme", hipaa_account: false });
});

Deno.test("account-get: forwards fields, and a stray slash in accountId is escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await accountGet.execute({ accountId: "weird/id", fields: "numeric_id" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/weird%2Fid.json");
  assertEquals(queryOf(calls[0].url).fields, "numeric_id");
});
