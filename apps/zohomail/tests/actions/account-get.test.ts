import { assertEquals, assertRejects } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("account-get: uses the explicit accountId when given", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ accountId: "explicit-id" }) }],
    usConnection(),
  );
  const out = await accountGet.execute({ accountId: "explicit-id" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/api/accounts/explicit-id");
  assertEquals(out, { accountId: "explicit-id" });
});

Deno.test("account-get: falls back to the connection's default accountId", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ accountId: "2560636000000008002" }) }],
    usConnection({ accountId: "2560636000000008002" }),
  );
  await accountGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/accounts/2560636000000008002");
});

Deno.test("account-get: throws when the response carries no account", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  await assertRejects(
    async () => {
      await accountGet.execute({ accountId: "1" }, ctx);
    },
    Error,
    "no account",
  );
});
