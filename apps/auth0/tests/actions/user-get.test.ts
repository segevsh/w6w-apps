import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("user-get: reads one user by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user_id: "auth0|1" } }], conn);
  await action.execute!({ userId: "auth0|1" }, ctx);
  assertEquals(decodeURIComponent(new URL(calls[0].url).pathname), "/api/v2/users/auth0|1");
});

/** The `|` in an Auth0 id must survive as a path segment. */
Deno.test("user-get: the connection-prefixed id is encoded, not split", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ userId: "google-oauth2|1234567890" }, ctx);
  assert(new URL(calls[0].url).pathname.includes("%7C"), new URL(calls[0].url).pathname);
});

Deno.test("user-get: a missing id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "userId");
});

/** This is the immediately-consistent alternative to search. */
Deno.test("user-get: says it is immediately consistent", () => {
  assert(/immediately consistent/.test(action.description!), action.description);
});
