import { assertEquals } from "@std/assert";
import action from "../../actions/sms-opt-out.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sms-opt-out: POSTs /sms/opt-out and tolerates the empty 200 body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute!({ phoneNumber: "+33612345678" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/sms/opt-out");
  assertEquals(JSON.parse(calls[0].body!), { phone_number: "+33612345678" });
  assertEquals(out, { ok: true, phoneNumber: "+33612345678" });
  assertEquals(action.idempotent, true);
});
