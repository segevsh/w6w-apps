import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/events-register.ts";

const sample = { attendance: 501 };

Deno.test("events-register: posts the documented body to /events/8/register", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    id: 8,
    customer: 12,
    customer_membership: 3,
    comped: true,
    providerId: 5,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events/8/register");
  assertEquals(calls[0].headers["teamup-provider-id"], "5");
  assertEquals(JSON.parse(calls[0].body!), { customer: 12, customer_membership: 3, comped: true });
  assertEquals(result.attendance, 501);
});

Deno.test("events-register: sends only the fields the caller supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 8, customer: 12 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  // Only what the caller supplied goes on the wire.
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["customer"]);
});

Deno.test("events-register: is idempotent — one attendance per customer per event", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params!.find((p) => p.key === "customer")!.required, true);
});
