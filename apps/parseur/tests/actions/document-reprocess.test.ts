import { assertEquals } from "@std/assert";
import documentReprocess from "../../actions/document-reprocess.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-reprocess: POSTs /document/{id}/process and returns the async acknowledgement", async () => {
  const { ctx, calls } = mockCtx([
    { body: { notification_set: { info: ["Document is being processed. Please wait."] } } },
  ]);
  const out = await documentReprocess.execute({ documentId: "9" }, ctx) as {
    notification_set: { info: string[] };
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/document/9/process");
  assertEquals(out.notification_set.info, ["Document is being processed. Please wait."]);
});

Deno.test("document-reprocess: is not idempotent — a retry spends credits again", () => {
  assertEquals(documentReprocess.idempotent, false);
});
