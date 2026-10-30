import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import exportConfigCreate from "../../actions/export-config-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("export-config-create: POSTs /parser/{id}/export_config", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "My Download" } }]);
  const out = await exportConfigCreate.execute(
    { mailboxId: "42", name: "My Download", type: "PARSER", items: ["CustomerName"] },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/parser/42/export_config");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "My Download",
    type: "PARSER",
    items: ["CustomerName"],
  });
  assertEquals(out.id, 1);
});

test("export-config-create: is not idempotent", () => {
  assertEquals(exportConfigCreate.idempotent, false);
});
