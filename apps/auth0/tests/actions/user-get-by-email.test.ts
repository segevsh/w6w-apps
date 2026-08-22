import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-by-email.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-get-by-email: queries the by-email endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ user_id: "auth0|1" }] }], conn);
  const out = await action.execute!({ email: "ada@example.com" }, ctx) as { count: number };
  assertEquals(out.count, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/users-by-email");
  assertEquals(url.searchParams.get("email"), "ada@example.com");
});

/** One address can be two users in two connections. */
Deno.test("user-get-by-email: several matches are normal, and reported", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: [{ user_id: "auth0|1" }, { user_id: "google-oauth2|2" }],
  }], conn);
  const out = await action.execute!({ email: "ada@example.com" }, ctx) as { count: number };
  assertEquals(out.count, 2);
  assert(logs.some((l) => /more than one/.test(l.message)), JSON.stringify(logs));
});

Deno.test("user-get-by-email: a missing email is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "email");
  assertEquals(calls.length, 0);
});

Deno.test("user-get-by-email: warns that picking the first is arbitrary", () => {
  assert(/ARRAY/.test(action.description!), action.description);
});
