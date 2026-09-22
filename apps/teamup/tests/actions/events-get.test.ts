import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/events-get.ts";

const sample = { id: 8, object: "event", name: "Yoga Flow", status: "active" };

Deno.test("events-get: reads /events/8 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 8, format: "json" }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events/8");
  assertEquals(url.searchParams.get("format"), "json");
  assertEquals(result.id, 8);
  assertEquals(result.status, "active");
});

Deno.test("events-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 8 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
