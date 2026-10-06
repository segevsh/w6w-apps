import { assertEquals } from "@std/assert";
import action from "../../actions/update-template.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-template: PUTs only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "t1" } } }]);
  await exec(action, { templateId: "t1", name: "New", tags: ["x"] }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/templates/t1");
  assertEquals(bodyOf(calls[0]), { name: "New", tags: ["x"] });
});

Deno.test("update-template: an explicit empty categories array clears them (is not dropped)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await exec(action, { templateId: "t1", categories: [] }, ctx);
  assertEquals(bodyOf(calls[0]), { categories: [] });
});

Deno.test("update-template: an app-built template's 404 is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Resource not found." } }]);
  let msg = "";
  try {
    await exec(action, { templateId: "app-made", name: "x" }, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("404"), true);
});
