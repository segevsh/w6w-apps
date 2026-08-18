import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/auth-get.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("auth-get: reads the account numbers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { numbers: { ach: [{ account: "1111", routing: "2222" }] }, accounts: [{ id: "a1" }] },
  }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/auth/get");
});

/** Bank details must never reach a log. */
Deno.test("auth-get: logs a count and nothing else", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { numbers: { ach: [{ account: "1111", routing: "2222" }] }, accounts: [{ id: "a1" }] },
  }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  const logged = JSON.stringify(logs);
  assert(!logged.includes("1111"), logged);
  assert(!logged.includes("2222"), logged);
  assert(!logged.includes("tok"), logged);
});

Deno.test("auth-get: says it is the most sensitive call here", () => {
  assert(/sensitive/.test(action.description!), action.description);
});
