import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import exportConfigDelete from "../../actions/export-config-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("export-config-delete: DELETEs /parser/{mailboxId}/export_config/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await exportConfigDelete.execute(
    { mailboxId: "42", exportConfigId: "1" },
    ctx,
  ) as { exportConfigId: string; status: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/parser/42/export_config/1");
  assertEquals(out, { exportConfigId: "1", status: 204 });
});

test("export-config-delete: is idempotent", () => {
  assertEquals(exportConfigDelete.idempotent, true);
});
