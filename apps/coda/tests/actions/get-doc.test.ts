import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-doc.ts";

Deno.test("get-doc: GETs /docs/{docId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "doc-1", name: "Roadmap" } }]);
  const out = await action.execute({ docId: "doc-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/docs/doc-1");
  assertEquals(out.name, "Roadmap");
});
