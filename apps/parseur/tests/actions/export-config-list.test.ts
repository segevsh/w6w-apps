import { assertEquals } from "@std/assert";
import exportConfigList from "../../actions/export-config-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("export-config-list: GETs /parser/{id}/export_config", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, name: "My Download" }]) }]);
  const out = await exportConfigList.execute({ mailboxId: "42" }, ctx) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/parser/42/export_config");
  assertEquals(out.results.length, 1);
});
