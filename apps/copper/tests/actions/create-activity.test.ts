import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/create-activity.ts";

Deno.test("create-activity: POSTs to /activities with the documented nested body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3064242278 } }]);
  await action.execute({
    parentType: "person",
    parentId: 27140359,
    details: "This is the description of this note",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/activities");
  assertEquals(JSON.parse(calls[0].body!), {
    parent: { type: "person", id: 27140359 },
    type: { category: "user", id: 0 },
    details: "This is the description of this note",
  });
});

Deno.test("create-activity: defaults the type id to 0, Copper's hard-coded Note", () => {
  assertEquals(param(action, "activityTypeId").default, 0);
});

Deno.test("create-activity: the category is always `user` — system activities are read-only", async () => {
  for (const id of [0, 190711, 191400]) {
    const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
    await action.execute(
      { parentType: "lead", parentId: 1, details: "x", activityTypeId: id },
      ctx,
    );
    const body = JSON.parse(calls[0].body!);
    assertEquals(body.type, { category: "user", id });
  }
  // And there is no knob to ask for a system activity, because it cannot work.
  const keys = (action.params ?? []).map((p) => p.key);
  assert(!keys.some((k) => /category/i.test(k)));
});

Deno.test("create-activity: forwards an explicit activity date and user id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    parentType: "company",
    parentId: 9607580,
    details: "Demo call",
    activityTypeId: 190711,
    activityDate: 1496703593,
    userId: 137658,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    parent: { type: "company", id: 9607580 },
    type: { category: "user", id: 190711 },
    details: "Demo call",
    activity_date: 1496703593,
    user_id: 137658,
  });
});

Deno.test("create-activity: requires a parent and details, and is not idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(
    (action.params ?? []).filter((p) => p.required).map((p) => p.key),
    ["parentType", "parentId", "details"],
  );
  assertEquals(optionValues(action, "parentType").length, 6);
});
