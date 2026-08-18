import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/directory-user-list.ts";

const page = (data: unknown[], after: string | null = null) => ({
  status: 200,
  body: { data, list_metadata: { after } },
});

Deno.test("directory-user-list: needs a directory or an organization to scope to", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "directoryId");
  assertEquals(calls.length, 0);
});

/** Suspended is the customer disabling somebody, not removing them. */
Deno.test("directory-user-list: counts the active users apart from the listed ones", async () => {
  const { ctx } = mockCtx([
    page([{ id: "du_1", state: "active" }, { id: "du_2", state: "suspended" }]),
  ]);
  const result = await action.execute!({ directoryId: "directory_1" }, ctx) as {
    count: number;
    activeCount: number;
  };
  assertEquals(result.count, 2);
  assertEquals(result.activeCount, 1);
});

Deno.test("directory-user-list: scopes by group when asked", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ directoryId: "directory_1", groupId: "directory_group_1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("directory"), "directory_1");
  assertEquals(q.get("group"), "directory_group_1");
});

/** A run log records the shape, not the people. */
Deno.test("directory-user-list: logs counts, not users", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "du_1", state: "active", emails: ["a@b.com"] }])]);
  await action.execute!({ directoryId: "directory_1" }, ctx);
  assertEquals(logs[0].data, { count: 1, activeCount: 1 });
});

/**
 * The mistake that makes a provisioning workflow silently wrong: a
 * deprovisioned user just stops being listed, leaving nothing to react to.
 */
Deno.test("directory-user-list: its description points at the event stream", () => {
  assert(/event-list/.test(action.description!), action.description);
});
