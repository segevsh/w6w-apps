import { assertEquals } from "@std/assert";
import documentSkip from "../../actions/document-skip.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-skip: POSTs /document/{id}/skip and returns the updated Document", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, status: "SKIPPED" } }]);
  const out = await documentSkip.execute({ documentId: "9" }, ctx) as { status: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/document/9/skip");
  assertEquals(out.status, "SKIPPED");
});

Deno.test("document-skip: is idempotent", () => {
  assertEquals(documentSkip.idempotent, true);
});
