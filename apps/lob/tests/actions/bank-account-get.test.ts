import { assert, assertEquals, assertRejects } from "@std/assert";
import bankAccountGet from "../../actions/bank-account-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bank-account-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "bank_abc", object: "x" } }]);
  const out = await bankAccountGet.execute({ bankAccountId: " bank_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/bank_accounts/bank_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "bank_abc");
});

Deno.test("bank-account-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await bankAccountGet.execute({ bankAccountId: "bank_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

Deno.test("bank-account-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await bankAccountGet.execute({ bankAccountId: "bank_zzz" }, ctx),
    Error,
    "not_found",
  );
});

Deno.test("bank-account-get: the full account number is stripped", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "bank_1",
      account_number: "987654321",
      routing_number: "322271627",
      verified: true,
    },
  }]);
  const out = await bankAccountGet.execute({ bankAccountId: "bank_1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals("account_number" in out, false);
  assertEquals(out.verified, true);
  assert(!JSON.stringify(out).includes("987654321"));
});
