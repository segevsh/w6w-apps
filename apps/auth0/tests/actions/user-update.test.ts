import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };
const ok = { status: 200, body: { user_id: "auth0|1" } };

Deno.test("user-update: PATCHes only the fields given", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ userId: "auth0|1", name: "Ada L." }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada L." });
});

/** Blocking is the reversible offboarding action. */
Deno.test("user-update: blocking sends a real boolean", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ userId: "auth0|1", blocked: "true" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { blocked: true });
});

Deno.test("user-update: unblocking sends false, not nothing", async () => {
  const { ctx, calls } = mockCtx([ok], conn);
  await action.execute!({ userId: "auth0|1", blocked: "false" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { blocked: false });
});

/** Auth0 needs the connection named when the email changes. */
Deno.test("user-update: changing the email without a connection is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ userId: "auth0|1", email: "new@example.com" }, ctx),
    Error,
    "connection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ userId: "auth0|1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

/** Top-level merge is not a deep merge. */
Deno.test("user-update: the metadata hint warns that nested objects are replaced", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "userMetadata")!;
  assert(/TOP LEVEL/.test(p.hint!), p.hint);
});
