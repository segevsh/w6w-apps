import { assertEquals } from "@std/assert";
import documentGetEmbeddedSignLink from "../../actions/document-get-embedded-sign-link.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-get-embedded-sign-link: sends DocumentId/SignerEmail/RedirectUrl as query params", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { signLink: "https://app.boldsign.com/sign/abc" },
  }]);
  const out = await documentGetEmbeddedSignLink.execute(
    { documentId: "doc-1", signerEmail: "jane@example.com", redirectUrl: "https://acme.test/done" },
    ctx,
  );
  assertEquals(pathOf(calls[0]), "/v1/document/getEmbeddedSignLink");
  const q = queryOf(calls[0]);
  assertEquals(q.get("DocumentId"), "doc-1");
  assertEquals(q.get("SignerEmail"), "jane@example.com");
  assertEquals(q.get("RedirectUrl"), "https://acme.test/done");
  assertEquals(out.signLink, "https://app.boldsign.com/sign/abc");
});

Deno.test("document-get-embedded-sign-link: redirectUrl is optional", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { signLink: "https://app.boldsign.com/sign/abc" },
  }]);
  await documentGetEmbeddedSignLink.execute({
    documentId: "doc-1",
    signerEmail: "jane@example.com",
  }, ctx);
  assertEquals(queryOf(calls[0]).has("RedirectUrl"), false);
});
