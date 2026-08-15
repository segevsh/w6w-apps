import { assertEquals } from "@std/assert";
import textMessageSend from "../../actions/text-message-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-message-send: POSTs an SMS body with the vendor's field names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "FyzZ6", company_id: "COM1" } }]);
  const out = await textMessageSend.execute(
    {
      accountId: "ACC1",
      companyId: "COM1",
      trackingNumber: "+17703334455",
      customerPhoneNumber: "+14044442233",
      content: "These are not the droids you are looking for.",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/text-messages.json");
  assertEquals(JSON.parse(calls[0].body!), {
    company_id: "COM1",
    tracking_number: "+17703334455",
    customer_phone_number: "+14044442233",
    content: "These are not the droids you are looking for.",
  });
  assertEquals(out, { id: "FyzZ6", company_id: "COM1" });
});

Deno.test("text-message-send: mediaUrl maps to media_url for MMS, media_file is not a param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await textMessageSend.execute(
    {
      accountId: "ACC1",
      companyId: "COM1",
      customerPhoneNumber: "+14044442233",
      content: "Check this out",
      mediaUrl: "https://example.com/image.jpg",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).media_url, "https://example.com/image.jpg");
  const keys = textMessageSend.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("mediaFile"), false);
});

Deno.test("text-message-send: not idempotent — a retry must not send the text twice", () => {
  assertEquals(textMessageSend.idempotent, false);
});
