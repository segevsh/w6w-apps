import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/identity-get.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("identity-get: reads the account holders", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }], conn);
  await action.execute!({ accessToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/identity/get");
});

/** A joint account genuinely has more than one owner. */
Deno.test("identity-get: warns that owners is a list", () => {
  assert(/joint account/i.test(action.description!), action.description);
});
