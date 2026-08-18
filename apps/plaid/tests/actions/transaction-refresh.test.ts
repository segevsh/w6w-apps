import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-refresh.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("transaction-refresh: asks Plaid to fetch now", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { request_id: "r1" } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/transactions/refresh");
});

/** It returns an acknowledgement; syncing immediately usually sees nothing. */
Deno.test("transaction-refresh: says the data arrives asynchronously", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assert(logs.some((l) => /asynchronously/.test(l.message)), JSON.stringify(logs));
  assert(/[Bb]illable/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
