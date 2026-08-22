import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-update.ts";

Deno.test("account-update: PUTs only what changed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account: {} } }]);
  await action.execute!({ callbackUrl: "https://hooks.example.com/sign" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { callback_url: "https://hooks.example.com/sign" });
});

/** An account id only names a target — on its own there is nothing to change. */
Deno.test("account-update: an account id alone is not an update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ accountId: "a2" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

/** The callback URL is account-wide; the hint has to say so. */
Deno.test("account-update: the callback URL warns that it is account-wide", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "callbackUrl")!;
  assert(param.hint!.includes("ACCOUNT-WIDE"), param.hint);
});
