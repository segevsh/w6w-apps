import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/document-file-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const pdf = new TextEncoder().encode("%PDF-1.7 fake");

Deno.test("document-file-get: GETs /v1/<type>/{id}/file with the chosen Accept and returns base64", async () => {
  const { ctx, calls } = mockCtx([{
    bytes: pdf,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="Rechnung-RE1012.pdf"',
    },
  }]);
  const out = await action.execute({ documentType: "invoices", id: "i1", format: "pdf" }, ctx) as {
    contentType: string;
    fileName: string;
    size: number;
    base64: string;
  };
  assertEquals(pathOf(calls[0].url), "/v1/invoices/i1/file");
  assertEquals(calls[0].headers["accept"], "application/pdf");
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.fileName, "Rechnung-RE1012.pdf");
  assertEquals(out.size, pdf.length);
  assertEquals(atob(out.base64), "%PDF-1.7 fake");
});

Deno.test("document-file-get: default Accept is */* and a missing disposition gives a null name", async () => {
  const { ctx, calls } = mockCtx([{ bytes: pdf, headers: { "content-type": "application/xml" } }]);
  const out = await action.execute({ documentType: "credit-notes", id: "c1" }, ctx) as {
    fileName: string | null;
  };
  assertEquals(calls[0].headers["accept"], "*/*");
  assertEquals(pathOf(calls[0].url), "/v1/credit-notes/c1/file");
  assertEquals(out.fileName, null);
});

Deno.test("document-file-get: a draft (409) surfaces the vendor error; bad input never hits the network", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { status: 409, message: "Draft has no file" } }]);
  await assertRejects(
    async () => await action.execute({ documentType: "invoices", id: "d1" }, ctx),
    Error,
    "Draft has no file",
  );
  const n = mockCtx();
  await assertRejects(
    async () => await action.execute({ documentType: "contacts" as never, id: "x" }, n.ctx),
    Error,
    "one of",
  );
  await assertRejects(
    async () => await action.execute({ documentType: "invoices", id: "" }, n.ctx),
    Error,
    "required",
  );
  assertEquals(n.calls.length, 0);
});
