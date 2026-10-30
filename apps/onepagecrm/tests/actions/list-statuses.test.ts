import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listStatuses from "../../actions/list-statuses.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("list-statuses: GET /statuses", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ status: { id: "s1", text: "Lead" } }]) }]);
  const out = await listStatuses.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/statuses");
  assertEquals(out.statuses, [{ status: { id: "s1", text: "Lead" } }]);
});
