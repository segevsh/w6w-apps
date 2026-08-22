import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/issue-list.ts";

const issues = ok({
  actor: {
    account: {
      aiIssues: {
        issues: {
          issues: [
            { issueId: "a", state: "CREATED", priority: "CRITICAL", title: "Errors up" },
            { issueId: "b", state: "ACTIVATED", priority: "HIGH", title: "Latency" },
            { issueId: "c", state: "CREATED", priority: "LOW", title: "Disk" },
          ],
          nextCursor: "c1",
        },
      },
    },
  },
});

Deno.test("issue-list: defaults to everything still open", async () => {
  const { ctx, calls } = mockCtx([issues], { display });
  await action.execute!({ states: "CREATED,ACTIVATED" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter.states, ["CREATED", "ACTIVATED"]);
});

/** CREATED alone omits everything somebody is already working on. */
Deno.test("issue-list: unacknowledged means CREATED, not merely open", async () => {
  const { ctx } = mockCtx([issues], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    unacknowledged: number;
    criticalCount: number;
  };
  assertEquals(result.count, 3);
  assertEquals(result.unacknowledged, 2);
  assertEquals(result.criticalCount, 1);
});

Deno.test("issue-list: a priority filter reaches the wire", async () => {
  const { ctx, calls } = mockCtx([issues], { display });
  await action.execute!({ priority: "critical" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter.priority, "CRITICAL");
});

Deno.test("issue-list: an empty filter object is not sent", async () => {
  const { ctx, calls } = mockCtx([issues], { display });
  await action.execute!({ states: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, undefined);
});

Deno.test("issue-list: no open issues is a count of zero", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { account: { aiIssues: { issues: { issues: [] } } } } }),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

/** Issue titles describe production problems. */
Deno.test("issue-list: logs counts, never the titles", async () => {
  const { ctx, logs } = mockCtx([issues], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("Errors up"), JSON.stringify(logs));
  assertEquals(logs[0].data, { accountId: 12345, count: 3 });
});

/** Incident, issue and anomaly are three different levels. */
Deno.test("issue-list: says why it queries issues rather than incidents", () => {
  assert(/ISSUE groups incidents/.test(action.description!), action.description);
});
