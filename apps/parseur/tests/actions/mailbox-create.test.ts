import { assertEquals } from "@std/assert";
import mailboxCreate from "../../actions/mailbox-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailbox-create: POSTs /parser with only the set named fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "Invoices" } }]);
  const out = await mailboxCreate.execute({ name: "Invoices", aiEngine: "GCP_AI_2" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/parser");
  assertEquals(JSON.parse(calls[0].body!), { name: "Invoices", ai_engine: "GCP_AI_2" });
  assertEquals(out.id, 1);
});

Deno.test("mailbox-create: extra fields are merged, and named fields win on conflict", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 2 } }]);
  await mailboxCreate.execute(
    { name: "Invoices", extra: { name: "Overridden by extra", disable_deskew: true } },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), { disable_deskew: true, name: "Invoices" });
});

Deno.test("mailbox-create: allowedExtensions is sent as an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 3 } }]);
  await mailboxCreate.execute({ allowedExtensions: ["pdf", "eml"] }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { allowed_extensions: ["pdf", "eml"] });
});

Deno.test("mailbox-create: is not idempotent", () => {
  assertEquals(mailboxCreate.idempotent, false);
});
