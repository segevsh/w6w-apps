import { assert, assertEquals } from "@std/assert";
import resumeLead from "../../actions/resume-lead.ts";
import markLeadInterested from "../../actions/mark-lead-interested.ts";
import markLeadNotInterested from "../../actions/mark-lead-not-interested.ts";
import pauseLead from "../../actions/pause-lead.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("resume-lead: POSTs /leads/start/{id} — `start`, not `resume` or `review`", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await resumeLead.execute!({ leadId: "lea_1" }, ctx);
  const path = new URL(calls[0].url).pathname;
  assertEquals(calls[0].method, "POST");
  assertEquals(path, "/api/leads/start/lea_1");
  // /leads/review/{id} is "Launch Lead" — a different operation needing emailPro.
  assert(!path.includes("/review/"));
  assert(!path.includes("/resume/"));
});

Deno.test("lead state actions: all four are idempotent performs", () => {
  for (const a of [markLeadInterested, markLeadNotInterested, pauseLead, resumeLead]) {
    assertEquals(a.type, "perform", a.key);
    assertEquals(a.idempotent, true, a.key);
  }
});

Deno.test("lead state actions: none send a request body", async () => {
  for (const a of [markLeadInterested, markLeadNotInterested]) {
    const { ctx, calls } = mockCtx([{ body: [] }]);
    await a.execute!({ leadIdOrEmail: "lea_1" }, ctx);
    assertEquals(calls[0].body, null, a.key);
  }
  for (const a of [pauseLead, resumeLead]) {
    const { ctx, calls } = mockCtx([{ body: [] }]);
    await a.execute!({ leadId: "lea_1" }, ctx);
    assertEquals(calls[0].body, null, a.key);
  }
});
