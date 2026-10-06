import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/complete-project.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("complete-project: PUTs completed (default true) to /complete", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 8 } } }, { body: { data: { id: 8 } } }]);
  await exec(action, { id: 8 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/v4/projects/8/complete`);
  assertEquals(bodyOf(calls[0]), { completed: true });
  await exec(action, { id: 8, completed: false }, ctx);
  assertEquals(bodyOf(calls[1]), { completed: false });
});

Deno.test("complete-project: a 422 surfaces and a bad id is refused", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ type: "Subprojects", message: "open subprojects" }] },
  }]);
  await assertRejects(() => exec(action, { id: 8 }, ctx), Error, "open subprojects");
  await assertRejects(() => exec(action, { id: 0 }, mockCtx().ctx), Error, "positive integer");
});
