import { assertEquals } from "@std/assert";
import { mockCtx, optionValues, param, run } from "../_helpers.ts";
import action from "../../actions/list-related-items.ts";

Deno.test("list-related-items: GETs /{entity}/{id}/related for every relation", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: 208105, type: "project" }, { id: 13358412, type: "company" }],
  }]);
  const out = await run<{ items: unknown[] }>(
    action,
    { entity: "people", entityId: 27140359 },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/27140359/related/");
  assertEquals(out.items, [{ id: 208105, type: "project" }, { id: 13358412, type: "company" }]);
});

Deno.test("list-related-items: narrows to one related type via the extra path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ entity: "leads", entityId: 8894157, relatedEntity: "tasks" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.copper.com/developer_api/v1/leads/8894157/related/tasks",
  );
});

Deno.test("list-related-items: offers exactly the six entity types Copper relates", () => {
  const expected = ["leads", "people", "companies", "opportunities", "projects", "tasks"];
  assertEquals(optionValues(action, "entity"), expected);
  assertEquals(optionValues(action, "relatedEntity"), expected);
  assertEquals(param(action, "entity").required, true);
  assertEquals(param(action, "relatedEntity").required, undefined);
});
