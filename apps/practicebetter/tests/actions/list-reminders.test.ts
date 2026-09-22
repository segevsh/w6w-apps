import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-reminders.ts";
import { API_ROOT, mockCtx, page, queryAllOf, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "rem-1" }], { count: 1 });

Deno.test("list-reminders: reads /consultant/reminders", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/reminders`);
  assertEquals(result, sample);
});

Deno.test("list-reminders: the documented filters are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    completed: false,
    consultants: ["c-1"],
    records: ["rec-1"],
    team_for: "team-1",
    type: ["follow_up", "intake"],
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.completed, "false");
  assertEquals(query.team_for, "team-1");
  const all = queryAllOf(calls[0].url);
  assertEquals(all.consultants, ["c-1"]);
  assertEquals(all.records, ["rec-1"]);
  assertEquals(all.type, ["follow_up", "intake"]);
});

Deno.test("list-reminders: the read-only reminder resource stands as the document names it", () => {
  assert(/List Tasks/.test(action.description!), action.description);
  assertEquals(action.type, "search");
  assertEquals(action.resource, "reminder");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});
