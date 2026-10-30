import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-project.ts";

test("delete-project: DELETEs /project/{id} and survives an empty body", async () => {
  // Documented as 200 OK with schema "No Content" — res.json() would throw.
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute!({ projectId: "P1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { status: 200 });
});

test("delete-project: warns that it is destructive and unrecoverable", () => {
  const text = `${action.description}`.toLowerCase();
  assert(text.includes("destructive") || text.includes("undoable"));
  assertEquals(action.idempotent, true);
});
