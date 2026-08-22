import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/profile-update.ts";

const conn = { display: { projectId: "123", region: "us", hasProjectToken: true } };
const accepted = { status: 200, body: { status: 1, error: null } };

Deno.test("profile-update: posts to /engage with verbose on", async () => {
  const { ctx, calls } = mockCtx([accepted], conn);
  await action.execute!(
    { operation: "$set", distinctId: "u1", properties: '{"plan":"pro"}' },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.host, "api.mixpanel.com");
  assertEquals(url.pathname, "/engage");
  // Without verbose, /engage answers a bare 1 or 0 inside a 200.
  assertEquals(url.searchParams.get("verbose"), "1");
  assertEquals(JSON.parse(calls[0].body!), [{ $distinct_id: "u1", $set: { plan: "pro" } }]);
});

/** The token goes in the payload, and only the sign hook may put it there. */
Deno.test("profile-update: a connection without a project token is refused before calling", async () => {
  const { ctx, calls } = mockCtx([], {
    display: { projectId: "123", region: "us", hasProjectToken: false },
  });
  const err = await assertRejects(
    async () =>
      await action.execute!({ operation: "$set", distinctId: "u1", properties: "{}" }, ctx),
    Error,
  );
  assert(/project token/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

/** The action never builds the token itself — the sign hook does. */
Deno.test("profile-update: does not put a token in the body", async () => {
  const { ctx, calls } = mockCtx([accepted], conn);
  await action.execute!({ operation: "$set", distinctId: "u1", properties: "{}" }, ctx);
  assert(!calls[0].body!.includes("$token"), calls[0].body!);
});

Deno.test("profile-update: $unset takes an array, and says so when given an object", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!(
        { operation: "$unset", distinctId: "u1", properties: '{"plan":true}' },
        ctx,
      ),
    Error,
    "ARRAY",
  );
});

Deno.test("profile-update: a batch of records overrides the single-user fields", async () => {
  const { ctx, calls } = mockCtx([accepted], conn);
  await action.execute!({
    operation: "$set",
    records: '[{"$distinct_id":"a","$set":{"x":1}},{"$distinct_id":"b","$set":{"x":2}}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).length, 2);
});

/** A 200 with status 0 is a failure, and must not read as success. */
Deno.test("profile-update: a rejected payload inside a 200 becomes an error", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { status: 0, error: "$token, missing or empty" } }],
    conn,
  );
  await assertRejects(
    async () =>
      await action.execute!({ operation: "$set", distinctId: "u1", properties: "{}" }, ctx),
    Error,
    "$token",
  );
});

/** $add and $append are not idempotent, so the action does not claim to be. */
Deno.test("profile-update: declares itself non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
