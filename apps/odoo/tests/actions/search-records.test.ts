import { assert, assertEquals } from "@std/assert";
import action from "../../actions/search-records.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("search-records: is a search action that pins no resource", () => {
  assertEquals(action.key, "search-records");
  assertEquals(action.type, "search");
  // The model is chosen at runtime, so a fixed resource would be a lie.
  assertEquals(action.resource, undefined);
});

Deno.test("search-records: runs search_read against whatever model was named", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 1 }] }]);
  await action.execute({
    model: "project.task",
    domain: [["stage_id", "=", 2]],
    fields: "name",
    limit: 10,
    offset: 5,
    order: "id desc",
  }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "project.task",
    method: "search_read",
    args: [],
    kwargs: {
      domain: [["stage_id", "=", 2]],
      fields: ["name"],
      limit: 10,
      offset: 5,
      order: "id desc",
    },
  });
});

Deno.test("search-records: returns records and count", async () => {
  const { ctx } = mockCtx([{ result: [{ id: 1 }, { id: 2 }] }]);
  const out = await action.execute({ model: "account.move" }, ctx) as { count: number };
  assertEquals(out.count, 2);
});

Deno.test("search-records: points at the discovery actions for model and field names", () => {
  assert(/List Models/.test(description(action)));
  assert(/Describe Model/.test(description(action)));
});
