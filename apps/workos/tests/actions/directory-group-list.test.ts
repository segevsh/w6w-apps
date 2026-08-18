import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/directory-group-list.ts";

const page = (data: unknown[], after: string | null = null) => ({
  status: 200,
  body: { data, list_metadata: { after } },
});

Deno.test("directory-group-list: needs a directory, organization or user to scope to", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "directoryId");
  assertEquals(calls.length, 0);
});

Deno.test("directory-group-list: one person's groups are reachable by user id", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "directory_group_1" }])]);
  const result = await action.execute!({ userId: "du_1" }, ctx) as { count: number };
  assertEquals(new URL(calls[0].url).searchParams.get("user"), "du_1");
  assertEquals(result.count, 1);
});

Deno.test("directory-group-list: a whole directory's groups are reachable too", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ directoryId: "directory_1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("directory"), "directory_1");
});

/** Customers rename groups without telling anybody. */
Deno.test("directory-group-list: says to map on the id, not the name", () => {
  assert(/group id/i.test(action.description!), action.description);
});
