import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("event-list: reads the change feed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "ev1" }] }], conn);
  await action.execute!({ eventTypes: "employee.terminated" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/events");
  assertEquals(url.searchParams.get("event_types"), "employee.terminated");
});

/** It carries the terminations that make people vanish from employee-list. */
Deno.test("event-list: says it covers the vanishing leavers", () => {
  assert(/employee list/i.test(action.description!), action.description);
});
