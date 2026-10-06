import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/copy-event.ts";

Deno.test("copy-event: POSTs unwrapped overrides", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "2" } }]);
  await action.execute!(
    { eventId: "1", name: "Copy", startDate: "2026-12-01T18:00:00Z", timezone: "UTC" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/copy/");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Copy",
    start_date: "2026-12-01T18:00:00Z",
    timezone: "UTC",
  });
});

Deno.test("copy-event: no overrides sends empty object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ eventId: "1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
