import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-list-group.ts";

/** A group spans organizations — the cross-org view issue-list cannot give. */
Deno.test("issue-list-group: hits the group path, not the org one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], links: {} } }], {
    display: { orgId: "org-1" },
  });
  await action.execute!({ groupId: "g1", effectiveSeverityLevel: ["critical"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/groups/g1/issues");
  assertEquals(url.searchParams.getAll("effective_severity_level"), ["critical"]);
});

Deno.test("issue-list-group: a group id is required — the connection's org does not apply", async () => {
  const { ctx, calls } = mockCtx([], { display: { orgId: "org-1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`groupId`");
  assertEquals(calls.length, 0);
});
