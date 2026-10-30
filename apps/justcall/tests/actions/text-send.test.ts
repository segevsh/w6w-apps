import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import textSend from "../../actions/text-send.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("text-send: POSTs to /v2.1/texts/new with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, direction: "Outbound" }) }]);
  await textSend.execute(
    { justcall_number: "+14155551234", contact_number: "+14155555678", body: "hi" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2.1/texts/new");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    justcall_number: "+14155551234",
    contact_number: "+14155555678",
    body: "hi",
  });
});

test("text-send: is declared non-idempotent — no dedupe key is documented", () => {
  assertEquals(textSend.idempotent, false);
});
