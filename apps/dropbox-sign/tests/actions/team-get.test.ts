import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-get.ts";

/** /team returns the whole member list inline; /team/info returns the team. */
Deno.test("team-get: calls /team/info, not /team", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { team: { name: "Acme" } } }]);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v3/team/info");
  assertEquals(result.name, "Acme");
});

Deno.test("team-get: a team id narrows it, and is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { team: {} } }]);
  await action.execute!({ teamId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("team_id"), "t1");
  const params = action.params as Array<{ key: string; required?: boolean }>;
  assert(!params[0].required, "the team id must stay optional");
});
