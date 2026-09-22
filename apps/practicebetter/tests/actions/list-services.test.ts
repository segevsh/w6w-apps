import { assertEquals } from "@std/assert";
import action from "../../actions/list-services.ts";
import { API_ROOT, mockCtx, page, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "svc-1", name: "Initial consultation" }], { count: 1 });

Deno.test("list-services: reads /consultant/services", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/services`);
  assertEquals(result, sample);
});

Deno.test("list-services: team_for and the pagination controls go through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({ team_for: "team-1", limit: 20, skip: 20 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.team_for, "team-1");
  assertEquals(query.limit, "20");
  assertEquals(query.skip, "20");
});

Deno.test("list-services: it is the source of a session's serviceId", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "service");
  assertEquals(/serviceId/.test(action.description!), true, action.description);
});
