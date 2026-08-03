import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import setSubscriberFields from "../../actions/set-subscriber-fields.ts";

Deno.test("set-subscriber-fields: POSTs subscriber_id plus the fields array", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberFields.execute!({
    subscriberId: "1",
    fields: [{ field_id: 7, field_name: "plan", field_value: "pro" }],
  }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/setCustomFields");
  assertEquals(JSON.parse(calls[0].body!), {
    subscriber_id: "1",
    fields: [{ field_id: 7, field_name: "plan", field_value: "pro" }],
  });
});

Deno.test("set-subscriber-fields: elements are forwarded verbatim, ids never inferred", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberFields.execute!({
    subscriberId: "1",
    fields: [{ field_name: "plan", field_value: "pro" }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).fields[0], { field_name: "plan", field_value: "pro" });
});

Deno.test("set-subscriber-fields: each element's value is coerced independently", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberFields.execute!({
    subscriberId: "1",
    fields: [
      { field_id: 1, field_value: "true" },
      { field_id: 2, field_value: "007" },
      { field_id: 3, field_value: "12" },
    ],
  }, ctx);
  const sent = JSON.parse(calls[0].body!).fields;
  assertEquals(sent[0].field_value, true);
  assertEquals(sent[1].field_value, "007");
  assertEquals(sent[2].field_value, 12);
});

Deno.test("set-subscriber-fields: the subscriber id stays a string", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await setSubscriberFields.execute!({ subscriberId: "9007199254740993", fields: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).subscriber_id, "9007199254740993");
});

Deno.test("set-subscriber-fields: is idempotent", () => {
  assertEquals(setSubscriberFields.idempotent, true);
});
