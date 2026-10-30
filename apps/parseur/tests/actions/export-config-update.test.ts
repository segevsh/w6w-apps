import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import exportConfigUpdate from "../../actions/export-config-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("export-config-update: PATCHes /parser/{mailboxId}/export_config/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Renamed" } }]);
  await exportConfigUpdate.execute(
    { mailboxId: "42", exportConfigId: "1", name: "Renamed" },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/parser/42/export_config/1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

test("export-config-update: is idempotent", () => {
  assertEquals(exportConfigUpdate.idempotent, true);
});
