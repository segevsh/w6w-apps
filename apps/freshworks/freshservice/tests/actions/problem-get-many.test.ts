import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/problem-get-many.ts";

test("problem-get-many: GETs /problems and unwraps `problems`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { problems: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/problems");
  assertEquals(out, { problems: [{ id: 1 }] });
});

test("problem-get-many: passes workspace_id 0 through for the all-workspaces read", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { problems: [] } }]);
  await action.execute({ workspaceId: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("workspace_id"), "0");
});
