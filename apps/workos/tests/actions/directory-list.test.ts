import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/directory-list.ts";

const page = (data: unknown[], after: string | null = null) => ({
  status: 200,
  body: { data, list_metadata: { after } },
});

Deno.test("directory-list: filters by organization and by name", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "directory_1" }])]);
  const result = await action.execute!({ organizationId: "org_1", search: "acme" }, ctx) as {
    count: number;
  };
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("organization_id"), "org_1");
  assertEquals(q.get("search"), "acme");
  assertEquals(result.count, 1);
});

Deno.test("directory-list: unfiltered, it lists every directory", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "directory_1" }, { id: "directory_2" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(new URL(calls[0].url).searchParams.get("organization_id"), null);
  assertEquals(result.count, 2);
});

/**
 * The gap this list exists to find: a customer with working sign-in and no
 * provisioning, whose joiners can log in with no account waiting for them.
 */
Deno.test("directory-list: says provisioning is independent of SSO", () => {
  assert(/Independent of SSO/i.test(action.description!), action.description);
});
