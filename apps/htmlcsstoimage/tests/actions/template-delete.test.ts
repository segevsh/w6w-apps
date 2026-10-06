import { assertEquals, assertRejects } from "@std/assert";
import templateDelete from "../../actions/template-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-delete: DELETEs /template/{id} and reports whatever success status came back", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await templateDelete.execute({ template_id: "t-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/template/t-1");
  assertEquals(out, { template_id: "t-1", status: 200 });
});

Deno.test("template-delete: 404 surfaces; requires an id; idempotent", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Not Found", "No template", 404) }]);
  const err = await assertRejects(
    async () => await templateDelete.execute({ template_id: "t" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("No template"), true);
  const none = mockCtx([]);
  await assertRejects(
    async () => await templateDelete.execute({ template_id: "" }, none.ctx),
    Error,
  );
  assertEquals(none.calls.length, 0);
  assertEquals(templateDelete.idempotent, true);
});
