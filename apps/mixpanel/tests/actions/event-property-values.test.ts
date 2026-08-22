import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-property-values.ts";

const conn = { display: { projectId: "123", region: "us" } };

Deno.test("event-property-values: sends the event, the property and the window", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await action.execute!({
    event: "Signed Up",
    name: "plan",
    fromDate: "2026-08-01",
    toDate: "2026-08-18",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/query/events/properties");
  assertEquals(url.searchParams.get("name"), "plan");
});

Deno.test("event-property-values: the event and property are both required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({ name: "plan", fromDate: "2026-08-01", toDate: "2026-08-18" }, ctx),
    Error,
    "event",
  );
  assertEquals(calls.length, 0);
});
