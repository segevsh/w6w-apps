import { assertEquals } from "@std/assert";
import mmsSend from "../../actions/mms-send.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mms-send: POSTs content_urls", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m", status: "sent" } }]);
  await mmsSend.execute({
    sender: "S",
    recipient: "R",
    contentUrls: ["https://e.com/a.jpg"],
    subject: "s",
    message: "m",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/mms");
  assertEquals(bodyOf(calls[0]), {
    sender: "S",
    recipient: "R",
    content_urls: ["https://e.com/a.jpg"],
    subject: "s",
    message: "m",
  });
});

Deno.test("mms-send: accepts content URLs as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await mmsSend.execute({
    sender: "S",
    recipient: "R",
    contentUrls: '["https://e.com/a.jpg"]' as unknown as string[],
  }, ctx);
  assertEquals(bodyOf(calls[0]).content_urls, ["https://e.com/a.jpg"]);
});

Deno.test("mms-send: is not idempotent", () => assertEquals(mmsSend.idempotent, false));
