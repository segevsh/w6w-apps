import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/events-leave-waitlist.ts";

const sample = { customer: 12 };

Deno.test("events-leave-waitlist: posts the documented body to /events/8/leave_waitlist", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 8, customer: 12 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events/8/leave_waitlist");
  assertEquals(JSON.parse(calls[0].body!), { customer: 12 });
  assertEquals(result.customer, 12);
});

Deno.test("events-leave-waitlist: sends only the fields the caller supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 8, customer: 12 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  // Only what the caller supplied goes on the wire.
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["customer"]);
});

Deno.test("events-leave-waitlist: is a required-customer perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.params!.find((p) => p.key === "customer")!.required, true);
});
