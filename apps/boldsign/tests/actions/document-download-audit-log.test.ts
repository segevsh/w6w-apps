import { assertEquals } from "@std/assert";
import documentDownloadAuditLog from "../../actions/document-download-audit-log.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-download-audit-log: base64-encodes the response bytes", async () => {
  const bytes = new TextEncoder().encode("audit trail pdf bytes");
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: bytes,
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await documentDownloadAuditLog.execute({ documentId: "doc-1" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/document/downloadAuditLog");
  assertEquals(queryOf(calls[0]).get("documentId"), "doc-1");
  assertEquals(out.encoding, "base64");
  assertEquals(atob(out.content), "audit trail pdf bytes");
});
