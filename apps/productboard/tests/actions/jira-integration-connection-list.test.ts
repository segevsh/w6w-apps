import { assertEquals } from "@std/assert";
import action from "../../actions/jira-integration-connection-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("jira-integration-connection-list: GETs the connections sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ entityId: "e-1" }]) }]);
  const out = await action.execute({ integrationId: "j-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/jira-integrations/j-1/connections");
  assertEquals(out.items.length, 1);
});

/** Given a Jira issue, find the Productboard entity — the point of this endpoint. */
Deno.test("jira-integration-connection-list: can be searched from the Jira side", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ integrationId: "j-1", issueKey: "API-100", issueId: "10042" }, ctx);
  assertEquals(queryOf(calls[0].url), { issueKey: "API-100", issueId: "10042" });
});

Deno.test("jira-integration-connection-list: the integration id is required", () => {
  assertEquals(action.params?.find((p) => p.key === "integrationId")?.required, true);
});
