import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, json, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

const QUEUED = {
  message: "message(s) queued",
  message_uuid: ["db3ce55a-7f1d-11e1-8ea7-1231380bc196"],
  api_id: "db342550-7f1d-11e1-8ea7-1231380bc196",
};

Deno.test("send-message: POSTs JSON src/dst/text to Message/ and returns Plivo's body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: QUEUED }], CONN);
  const out = await action.execute!(
    { from: "+14151234567", to: "+14157654321", text: "Hello" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, BASE + "Message/");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(json(calls[0]), { src: "+14151234567", dst: "+14157654321", text: "Hello" });
  assertEquals(out, QUEUED);
});

Deno.test("send-message: several recipients are joined with `<`", async () => {
  const { ctx, calls } = mockCtx([{ body: QUEUED }], CONN);
  await action.execute!({ from: "1", to: ["14156667777", " 14157778888 ", ""], text: "x" }, ctx);
  assertEquals(json(calls[0]).dst, "14156667777<14157778888");
});

Deno.test("send-message: media URLs make it an MMS with an array media_urls", async () => {
  const { ctx, calls } = mockCtx([{ body: QUEUED }], CONN);
  await action.execute!(
    { from: "1", to: "2", mediaUrls: ["https://x/a.jpg", "  ", "https://x/b.png"] },
    ctx,
  );
  const body = json(calls[0]);
  assertEquals(body.type, "mms");
  assertEquals(body.media_urls, ["https://x/a.jpg", "https://x/b.png"]);
  assertEquals("text" in body, false);
});

Deno.test("send-message: Powerpack, callback and delivery options use the documented names", async () => {
  const { ctx, calls } = mockCtx([{ body: QUEUED }], CONN);
  await action.execute!(
    {
      powerpackUuid: "pp-1",
      to: "2",
      text: "code 1234",
      type: "sms",
      callbackUrl: "https://example.com/cb",
      callbackMethod: "GET",
      messageExpiry: 60,
      log: "number_only",
      trackable: true,
    },
    ctx,
  );
  assertEquals(json(calls[0]), {
    powerpack_uuid: "pp-1",
    dst: "2",
    text: "code 1234",
    type: "sms",
    url: "https://example.com/cb",
    method: "GET",
    message_expiry: 60,
    log: "number_only",
    trackable: true,
  });
});

Deno.test("send-message: refuses before any request when sender, recipient or content is missing", async () => {
  for (
    const [input, needle] of [
      [{ to: "2", text: "x" }, "sender is required"],
      [{ from: "1", text: "x" }, "`to` is required"],
      [{ from: "1", to: "2" }, "Set `text`"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], CONN);
    await assertRejects(async () => await action.execute!(input as never, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});

Deno.test("send-message: a 400 carries Plivo's error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { api_id: "a", error: "invalid dst" } }], CONN);
  await assertRejects(
    async () => await action.execute!({ from: "1", to: "bad", text: "x" }, ctx),
    Error,
    "invalid dst",
  );
});
