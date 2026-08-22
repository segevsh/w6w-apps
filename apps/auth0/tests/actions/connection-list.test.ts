import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("connection-list: filters by strategy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "con_1" }] }], conn);
  await action.execute!({ strategy: "auth0, samlp" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("strategy"), "auth0,samlp");
});

/** Only a database connection can have users created in it. */
Deno.test("connection-list: says which strategy is writable", () => {
  assert(/auth0`-strategy|auth0.-strategy/.test(action.description!), action.description);
});
