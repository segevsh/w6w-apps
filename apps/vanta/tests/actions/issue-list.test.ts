import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/issue-list.ts";

Deno.test("issue-list: defaults to soonest-due first", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "i1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/issues");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("orderBy"), "dueDate");
  assertEquals(q.get("orderDirection"), "asc");
  assertEquals(result.count, 1);
});

/** The query worth scheduling: what is about to be overdue. */
Deno.test("issue-list: a due-before date is normalised to an ISO timestamp", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ dueBeforeDate: "2026-08-25" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("dueBeforeDate"),
    "2026-08-25T00:00:00.000Z",
  );
});

/** Vanta rejects the pair, so a caller asking for undated issues drops the dates. */
Deno.test("issue-list: only-without-a-due-date suppresses the date filters", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ onlyWithoutDueDate: true, dueBeforeDate: "2026-08-25" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("includeOnlyIssuesWithoutDueDate"), "true");
  assertEquals(q.get("dueBeforeDate"), null);
});

Deno.test("issue-list: status, severity and owner filters are repeated keys", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ statuses: "OPEN", severities: "HIGH, CRITICAL", owners: "u1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("statusMatchesAny"), ["OPEN"]);
  assertEquals(q.getAll("severityMatchesAny"), ["HIGH", "CRITICAL"]);
  assertEquals(q.getAll("ownerIdMatchesAny"), ["u1"]);
});

Deno.test("issue-list: logs a count", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "i1" }])], { display });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 1 });
});

/** Issues nobody scheduled never appear in an overdue report. */
Deno.test("issue-list: names the undated-issue trap", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "onlyWithoutDueDate")!;
  assert(/never get\s+done/.test(p.hint!), p.hint);
});
