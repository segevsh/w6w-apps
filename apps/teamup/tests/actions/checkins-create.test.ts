import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checkins-create.ts";

const sample = { id: 21, object: "checkin", timestamp: "2026-09-22T07:01:00Z", comped: false };

Deno.test("checkins-create: posts the documented body to /checkins", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  const result = await action.execute!({
    date: "2026-09-22",
    venue: 3,
    customer: 12,
    customer_membership: 7,
    comped: false,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/checkins");
  assertEquals(JSON.parse(calls[0].body!), {
    date: "2026-09-22",
    venue: 3,
    customer: 12,
    customer_membership: 7,
    comped: false,
  });
  assertEquals(result.id, 21);
});

Deno.test("checkins-create: omits unset body fields instead of sending nulls", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  await action.execute!({ date: "2026-09-22", venue: 3, customer: 12 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["date", "venue", "customer"]);
});

Deno.test("checkins-create: is a non-idempotent perform with three required fields", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  for (const key of ["date", "venue", "customer"]) {
    assertEquals(action.params!.find((p) => p.key === key)!.required, true, key);
  }
});
