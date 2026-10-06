import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-entry.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("update-entry: PUTs only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { entry: { id: 5, text: "new" } } }]);
  const out = await exec(action, { id: 5, text: "new", billable: "12", projectsId: 8 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/v2/entries/5`);
  assertEquals(bodyOf(calls[0]), { projects_id: 8, billable: 12, text: "new" });
  assertEquals(out, { entry: { id: 5, text: "new" } });
});

Deno.test("update-entry: no fields and a bad id are refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: 5 }, none.ctx), Error, "at least one");
  await assertRejects(
    () => exec(action, { id: 0, text: "x" }, none.ctx),
    Error,
    "positive integer",
  );
  assertEquals(none.calls.length, 0);
});
