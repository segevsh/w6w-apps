import { assert, assertEquals } from "@std/assert";
import { description, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-tasks.ts";

Deno.test("list-tasks: GETs /task/ and maps filters to Close's names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({
    leadId: "lead_1",
    assignedTo: "user_1",
    isComplete: false,
    type: "all",
    dateGte: "2026-01-01",
    dateLte: "2026-02-01",
    orderBy: "date",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/task/");
  assertEquals(q.get("lead_id"), "lead_1");
  assertEquals(q.get("assigned_to"), "user_1");
  assertEquals(q.get("is_complete"), "false");
  assertEquals(q.get("_type"), "all");
  assertEquals(q.get("_order_by"), "date");
});

Deno.test("list-tasks: filters on `date`, NOT the deprecated `due_date`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ dateGte: "2026-01-01", dateLte: "2026-02-01" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("date__gte"), "2026-01-01");
  assertEquals(q.get("date__lte"), "2026-02-01");
  // Close: "The `due_date` field is deprecated and should not be used."
  assertEquals(q.has("due_date__gte"), false);
  assertEquals(q.has("due_date__lte"), false);
});

Deno.test("list-tasks: sends is_complete=false rather than dropping the false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ isComplete: false }, ctx);
  // A dropped `false` would silently return the archive too.
  assertEquals(new URL(calls[0].url).searchParams.get("is_complete"), "false");
});

Deno.test("list-tasks: offers `all`, because Close otherwise returns only lead tasks", () => {
  const values = optionValues(action, "type");
  assertEquals(values[0], "all");
  assert(values.includes("missed_call") && values.includes("voicemail"));
  assert(/ONLY|only/.test(description(action)));
});
