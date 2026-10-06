import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("task-list: bracketed arrays and filters reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await taskList.execute({
    property_ids: "p1,p2",
    start_date: "2026-11-01",
    end_date: "2026-11-07",
    task_types: "1,3",
    statuses: "pending completed",
    reservation_uuid: "r1",
    teammate_uuid: "t1",
    include: "marketplace",
    page: 2,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tasks");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("properties[]"), ["p1", "p2"]);
  assertEquals(q.getAll("task_types[]"), ["1", "3"]);
  // a space is not a separator: one malformed status goes through for the vendor to reject
  assertEquals(q.getAll("status[]"), ["pending completed"]);
  assertEquals(q.get("reservation_uuid"), "r1");
  assertEquals(q.get("teammate_uuid"), "t1");
  assertEquals(q.get("include"), "marketplace");
  assertEquals(q.get("page"), "2");
  assertEquals(requiredOf(taskList), ["property_ids"]);
});
