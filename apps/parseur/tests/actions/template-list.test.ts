import { assertEquals } from "@std/assert";
import templateList from "../../actions/template-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-list: GETs /parser/{id}/template_set", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, name: "My Template" }]) }]);
  const out = await templateList.execute({ mailboxId: "42" }, ctx) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/parser/42/template_set");
  assertEquals(out.results.length, 1);
});
