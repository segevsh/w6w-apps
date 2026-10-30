import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import tokenInfoGet from "../../actions/token-info-get.ts";
import { mockCtx, mockCtxWithRegion } from "../_helpers.ts";

test("token-info-get: GET /oauth/userinfo on the connection's own host", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "u1",
      email: "a@b.co",
      companyName: "Acme",
      scopes: ["public.records.readRecords"],
    },
  }]);
  const out = await tokenInfoGet.execute({}, ctx) as { scopes: string[] };
  assertEquals(calls[0].url, "https://ironcladapp.com/oauth/userinfo");
  assertEquals(out.scopes, ["public.records.readRecords"]);
});

test("token-info-get: follows the connection's region to the EU host", async () => {
  const { ctx, calls } = mockCtxWithRegion("eu1", [{ body: { id: "u1" } }]);
  await tokenInfoGet.execute({}, ctx);
  assertEquals(calls[0].url, "https://eu1.ironcladapp.com/oauth/userinfo");
});
