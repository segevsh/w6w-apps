import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const page = (data: unknown[], after: string | null = null) => ({
  status: 200,
  body: { data, list_metadata: { after } },
});

Deno.test("user-list: an exact email is the fastest route to a user id", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "user_1" }])]);
  await action.execute!({ email: "ada@acme.com" }, ctx);
  assert(calls[0].url.startsWith("https://api.workos.com/user_management/users?"), calls[0].url);
  assertEquals(new URL(calls[0].url).searchParams.get("email"), "ada@acme.com");
});

Deno.test("user-list: scopes to one customer's members", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ organizationId: "org_1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("organization_id"), "org_1");
});

/** A run log is not the place for somebody's address. */
Deno.test("user-list: logs a count, not the people", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "user_1", email: "ada@acme.com" }])]);
  await action.execute!({ email: "ada@acme.com" }, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

/**
 * A User is an identity that can authenticate; a Directory User is a record the
 * customer's system pushed. Five hundred of one and three of the other is a
 * correct state of affairs, not a sync failure.
 */
Deno.test("user-list: says it is not the customer's directory", () => {
  assert(/NOT the customer's directory/i.test(action.description!), action.description);
});
