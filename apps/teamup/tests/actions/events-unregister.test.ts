import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/events-unregister.ts";

const sample = { late: "True", attendance: 502 };

Deno.test("events-unregister: posts the documented body to /events/8/unregister", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!(
    { id: 8, customer: 12, is_late_cancel: true },
    ctx,
  ) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events/8/unregister");
  assertEquals(JSON.parse(calls[0].body!), { customer: 12, is_late_cancel: true });
  assertEquals(result.late, "True");
  assertEquals(result.attendance, 502);
});

Deno.test("events-unregister: sends only the fields the caller supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 8, customer: 12 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  // Only what the caller supplied goes on the wire.
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["customer"]);
});

/** TeamUp answers `late` as a string; the declared output says so. */
Deno.test("events-unregister: declares `late` as the string TeamUp returns", () => {
  const fields = action.output as Array<{ key: string; type: string }>;
  assertEquals(fields.find((f) => f.key === "late")!.type, "string");
  assertEquals(fields.find((f) => f.key === "attendance")!.type, "number");
});
