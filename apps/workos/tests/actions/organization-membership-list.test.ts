import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-membership-list.ts";

const page = (data: unknown[], after: string | null = null) => ({
  status: 200,
  body: { data, list_metadata: { after } },
});

/** An unfiltered list counts an unaccepted invitation as access. */
Deno.test("organization-membership-list: defaults to active, not to everything", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "om_1" }])]);
  await action.execute!({ organizationId: "org_1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("statuses"), "active");
});

Deno.test("organization-membership-list: the all-statuses option sends no filter", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ organizationId: "org_1", statuses: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("statuses"), null);
});

Deno.test("organization-membership-list: one person's memberships are reachable by user", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "om_1" }])]);
  await action.execute!({ userId: "user_1", statuses: "pending" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("user_id"), "user_1");
  assertEquals(q.get("statuses"), "pending");
});

Deno.test("organization-membership-list: needs an organization or a user", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "organizationId");
  assertEquals(calls.length, 0);
});

Deno.test("organization-membership-list: the status param warns what an unfiltered list counts", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "statuses")!;
  assert(/invitation as access/.test(p.hint!), p.hint);
});
