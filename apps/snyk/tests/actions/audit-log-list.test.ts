import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-list.ts";

const display = { orgId: "org-1" };

Deno.test("audit-log-list: searches with event and date filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], links: {} } }], { display });
  await action.execute!({ events: "org.project.delete", from: "2026-01-01T00:00:00Z" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/audit_logs/search");
  assertEquals(q.getAll("events"), ["org.project.delete"]);
  assertEquals(q.get("from"), "2026-01-01T00:00:00Z");
});

/** Snyk treats include and exclude as mutually exclusive. */
Deno.test("audit-log-list: refuses events and excludeEvents together", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ events: "a", excludeEvents: "b" }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});
