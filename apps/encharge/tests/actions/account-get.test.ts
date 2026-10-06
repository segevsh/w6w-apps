import { assert, assertEquals, assertRejects } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const run = (ctx: Parameters<typeof accountGet.execute>[1]) =>
  accountGet.execute({} as never, ctx) as Promise<unknown>;

Deno.test("account-get: declares a read action", () => {
  assertEquals(accountGet.key, "account-get");
  assertEquals(accountGet.type, "read");
  assert((accountGet.description ?? "").length > 0);
  assert(Array.isArray(accountGet.output) && accountGet.output.length > 0);
});

Deno.test("account-get: GETs /accounts/info and returns the documented members", async () => {
  const body = {
    accountId: "a1",
    name: "Acme",
    status: "active",
    timezone: "UTC",
    site: "acme.com",
    peopleCount: 12,
    activeServices: ["email"],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await run(ctx), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.encharge.io/v1/accounts/info");
});

Deno.test("account-get: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("User not logged in") }]);
  await assertRejects(() => run(ctx), Error, "User not logged in");
});
