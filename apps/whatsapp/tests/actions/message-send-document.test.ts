import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-document.ts";

const OK = { messaging_product: "whatsapp", messages: [{ id: "wamid.4" }] };

Deno.test("message-send-document: POSTs a document message with the link", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await action.execute({ to: "1", link: "https://example.com/invoice.pdf" }, ctx);
  assertEquals(out, OK);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "document");
  assertEquals(body.document, { link: "https://example.com/invoice.pdf" });
});

Deno.test("message-send-document: includes caption and filename when set", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { to: "1", link: "https://example.com/invoice.pdf", caption: "Q3", filename: "invoice-q3.pdf" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).document, {
    link: "https://example.com/invoice.pdf",
    caption: "Q3",
    filename: "invoice-q3.pdf",
  });
});
