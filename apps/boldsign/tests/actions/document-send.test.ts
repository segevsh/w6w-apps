import { assertEquals } from "@std/assert";
import documentSend from "../../actions/document-send.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-send: posts fileUrls and signers as given, dropping unset optionals", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { documentId: "doc-1" } }]);
  const out = await documentSend.execute(
    {
      fileUrls: ["https://example.com/a.pdf"],
      signers: [{ name: "Jane Doe", emailAddress: "jane@example.com", signerOrder: 1 }],
    },
    ctx,
  );
  assertEquals(pathOf(calls[0]), "/v1/document/send");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.fileUrls, ["https://example.com/a.pdf"]);
  assertEquals(body.signers, [{
    name: "Jane Doe",
    emailAddress: "jane@example.com",
    signerOrder: 1,
  }]);
  assertEquals(body.title, undefined);
  assertEquals(body.cc, undefined);
  assertEquals(out, { documentId: "doc-1" });
});

Deno.test("document-send: maps `cc` addresses into BoldSign's {emailAddress} shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { documentId: "doc-1" } }]);
  await documentSend.execute(
    {
      fileUrls: ["https://example.com/a.pdf"],
      signers: [],
      cc: ["a@x.com", "b@x.com"],
    },
    ctx,
  );
  const body = bodyOf(calls[0]);
  assertEquals(body.cc, [{ emailAddress: "a@x.com" }, { emailAddress: "b@x.com" }]);
});

Deno.test("document-send: passes title, message and enableSigningOrder through", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { documentId: "doc-1" } }]);
  await documentSend.execute(
    {
      title: "NDA",
      message: "Please sign",
      fileUrls: ["https://example.com/a.pdf"],
      signers: [],
      enableSigningOrder: true,
    },
    ctx,
  );
  const body = bodyOf(calls[0]);
  assertEquals(body.title, "NDA");
  assertEquals(body.message, "Please sign");
  assertEquals(body.enableSigningOrder, true);
});

Deno.test("document-send: is declared not idempotent", () => {
  assertEquals(documentSend.idempotent, false);
});
