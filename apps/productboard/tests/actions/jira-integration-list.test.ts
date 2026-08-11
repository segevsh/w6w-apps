import { assert, assertEquals } from "@std/assert";
import action from "../../actions/jira-integration-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("jira-integration-list: GETs /v2/jira-integrations", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "j-1" }], "cur") }]);
  const out = await action.execute({ pageCursor: "prev" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/jira-integrations");
  assertEquals(queryOf(calls[0].url), { pageCursor: "prev" });
  assertEquals(out.nextPageCursor, "cur");
});

/** All four v2 Jira operations are GETs — there is no write surface to expose. */
Deno.test("jira-integration-list: states that the Jira surface is read-only", () => {
  assert(action.description!.includes("read-only"), action.description!);
  assertEquals(action.type, "search");
});
