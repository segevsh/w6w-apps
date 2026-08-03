import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/search-activities.ts";

Deno.test("search-activities: POSTs to /activities/search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ pageSize: 25 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/activities/search");
  assertEquals(JSON.parse(calls[0].body!), { page_size: 25 });
});

Deno.test("search-activities: assembles `parent` from its two halves", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ parentType: "person", parentId: 27140359 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { parent: { id: 27140359, type: "person" } });
});

Deno.test("search-activities: omits `parent` unless BOTH halves are supplied", async () => {
  for (const partial of [{ parentType: "person" }, { parentId: 1 }]) {
    const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
    await action.execute(partial, ctx);
    assert(!("parent" in JSON.parse(calls[0].body!)), "sent a half-built parent object");
  }
});

Deno.test("search-activities: passes activity_types through as id/category pairs", async () => {
  // An id alone is ambiguous: user and system types are numbered separately.
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ activityTypes: [{ id: 0, category: "user" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { activity_types: [{ id: 0, category: "user" }] });
});

Deno.test("search-activities: maps the date bounds and the full_result escape hatch", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({
    minimumActivityDate: 1489019856,
    maximumActivityDate: 1496772355,
    fullResult: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    minimum_activity_date: 1489019856,
    maximum_activity_date: 1496772355,
    full_result: true,
  });
});

Deno.test("search-activities: warns that full_result needs an admin key and may duplicate rows", () => {
  const hint = param(action, "fullResult").hint ?? "";
  assert(/administrator/i.test(hint));
  assert(/duplicate/i.test(hint));
});

Deno.test("search-activities: offers Copper's six parent types", () => {
  assertEquals(optionValues(action, "parentType"), [
    "lead",
    "person",
    "company",
    "opportunity",
    "project",
    "task",
  ]);
});
