import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import templateDelete from "../../actions/template-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("template-delete: DELETEs /template/{id} and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await templateDelete.execute({ templateId: "5" }, ctx) as {
    templateId: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/template/5");
  assertEquals(out, { templateId: "5", status: 204 });
});

test("template-delete: is idempotent", () => {
  assertEquals(templateDelete.idempotent, true);
});
