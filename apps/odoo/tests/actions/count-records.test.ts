import { assert, assertEquals } from "@std/assert";
import action from "../../actions/count-records.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("count-records: is a read action that pins no resource", () => {
  assertEquals(action.key, "count-records");
  assertEquals(action.type, "read");
  assertEquals(action.resource, undefined);
});

Deno.test("count-records: search_count takes the domain POSITIONALLY", async () => {
  // The shape differs from search_read and this is the easy mistake: args is a
  // ONE-element list whose element IS the domain. Verified live.
  const { ctx, calls } = mockCtx([{ result: 2 }]);
  const out = await action.execute({
    model: "res.partner",
    domain: [["name", "like", "W6W"]],
  }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "search_count",
    args: [[["name", "like", "W6W"]]],
    kwargs: {},
  });
  assertEquals(out, { count: 2 });
});

Deno.test("count-records: an empty domain counts everything readable", async () => {
  const { ctx, calls } = mockCtx([{ result: 99 }]);
  assertEquals(await action.execute({ model: "crm.lead" }, ctx), { count: 99 });
  assertEquals(executeKwArgs(calls[0]).args, [[]]);
});

Deno.test("count-records: sells itself as cheaper than listing to count", () => {
  assert(/without transferring/i.test(description(action)));
});
