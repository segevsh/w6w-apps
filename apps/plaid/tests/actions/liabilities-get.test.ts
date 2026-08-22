import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/liabilities-get.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("liabilities-get: reads the liabilities", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { liabilities: {} } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/liabilities/get");
});

/** Terms, not balances — and coverage varies. */
Deno.test("liabilities-get: says coverage varies by institution", () => {
  assert(/varies by institution/i.test(action.description!), action.description);
});
