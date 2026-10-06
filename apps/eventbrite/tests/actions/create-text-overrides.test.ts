import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-text-overrides.ts";

Deno.test("create-text-overrides: POSTs strings mapped to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    organizationId: "5",
    locale: "en_US",
    eventId: "e1",
    strings: [
      { textCode: "event_postponed", message: "Later" },
      { textCode: "tickets_sold_out", messageCode: "tickets_unavailable" },
    ],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/5/text_overrides/");
  assertEquals(JSON.parse(calls[0].body!), {
    strings: [
      { text_code: "event_postponed", message: "Later" },
      { text_code: "tickets_sold_out", message_code: "tickets_unavailable" },
    ],
    locale: "en_US",
    event_id: "e1",
  });
});
