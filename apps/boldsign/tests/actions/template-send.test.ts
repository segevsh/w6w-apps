import { assertEquals } from "@std/assert";
import templateSend from "../../actions/template-send.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-send: sends templateId as a query param and roles in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { documentId: "doc-1" } }]);
  const out = await templateSend.execute(
    {
      templateId: "tpl-1",
      roles: [{ roleIndex: 1, signerName: "Jane Doe", signerEmail: "jane@example.com" }],
    },
    ctx,
  );
  assertEquals(pathOf(calls[0]), "/v1/template/send");
  assertEquals(queryOf(calls[0]).get("templateId"), "tpl-1");
  const body = bodyOf(calls[0]);
  assertEquals(body.roles, [{
    roleIndex: 1,
    signerName: "Jane Doe",
    signerEmail: "jane@example.com",
  }]);
  assertEquals(out, { documentId: "doc-1" });
});

Deno.test("template-send: maps `cc` addresses into BoldSign's {emailAddress} shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { documentId: "doc-1" } }]);
  await templateSend.execute(
    { templateId: "tpl-1", roles: [], cc: ["a@x.com"] },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).cc, [{ emailAddress: "a@x.com" }]);
});

Deno.test("template-send: is declared not idempotent", () => {
  assertEquals(templateSend.idempotent, false);
});
