import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/events-join-waitlist.ts";

const sample = { id: 91, object: "waitlist_spot", status: "on_waitlist", position: 3 };

Deno.test("events-join-waitlist: posts the documented body to /events/8/join_waitlist", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 8, customer: 12 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events/8/join_waitlist");
  assertEquals(JSON.parse(calls[0].body!), { customer: 12 });
  assertEquals(result.status, "on_waitlist");
  assertEquals(result.position, 3);
});

Deno.test("events-join-waitlist: sends only the fields the caller supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 8, customer: 12 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  // Only what the caller supplied goes on the wire.
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["customer"]);
});

/** The spot's state, not the join, is what a notifier has to watch. */
Deno.test("events-join-waitlist: declares the spot's status and reservation fields", () => {
  const fields = action.output as Array<{ key: string; type: string }>;
  assertEquals(fields.find((f) => f.key === "status")!.type, "string");
  assertEquals(fields.find((f) => f.key === "reserved_spot_expires_at")!.type, "string");
  assertEquals(fields.find((f) => f.key === "position")!.type, "number");
});
