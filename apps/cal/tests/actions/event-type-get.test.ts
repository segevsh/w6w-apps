import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-type-get.ts";

Deno.test("event-type-get: GETs /event-types/{id} with cal-api-version 2024-06-14", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 42 } } }]);
  const result = await action.execute({ eventTypeId: 42 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/event-types/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["cal-api-version"], "2024-06-14");
  assertEquals(result, { data: { id: 42 } });
});
