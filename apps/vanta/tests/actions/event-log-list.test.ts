import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/event-log-list.ts";

Deno.test("event-log-list: reads Vanta's own audit trail", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "e1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/event-logs");
  assertEquals(result.count, 1);
});

/** Store the last event's timestamp and pass it next run. */
Deno.test("event-log-list: the start date is normalised to a timestamp", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ startDate: "2026-08-18" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("startDate"),
    "2026-08-18T00:00:00.000Z",
  );
});

Deno.test("event-log-list: logs a count, not the events", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "e1", actor: "ada@acme.com" }])], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

/** There is no end-date filter — it reads forward from a point. */
Deno.test("event-log-list: says it is shaped for tailing, not history", () => {
  assert(/tailing job/.test(action.description!), action.description);
});
