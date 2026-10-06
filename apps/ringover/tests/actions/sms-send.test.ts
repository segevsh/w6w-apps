import { assertEquals } from "@std/assert";
import action from "../../actions/sms-send.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sms-send: POSTs /push/sms with string numbers", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { message_id: 1, conv_id: 2 } }]);
  const out = await action.execute!({
    fromNumber: " +33140000000 ",
    toNumber: "+33612345678",
    content: "Hello",
    archivedAuto: true,
  }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/push/sms");
  assertEquals(JSON.parse(calls[0].body!), {
    from_number: "+33140000000",
    to_number: "+33612345678",
    content: "Hello",
    archived_auto: true,
  });
  assertEquals(out, { message_id: 1, conv_id: 2 });
  assertEquals(action.idempotent, false);
});
