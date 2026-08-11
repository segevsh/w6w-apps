import { assertEquals } from "@std/assert";
import action from "../../actions/entity-search.ts";
import { bodyOf, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("entity-search: POSTs the filter body to /v2/entities/search", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const filter = { type: ["initiative"], fields: { status: [{ name: "In Progress" }] } };
  const out = await action.execute({ filter }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/entities/search");
  assertEquals(bodyOf(calls[0]), { data: { filter } });
  assertEquals(out.items.length, 1);
});

Deno.test("entity-search: the type filter goes in the BODY, not as a repeated query key", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ filter: { type: ["feature"] } }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("entity-search: return fields become the body's return.fields array", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ returnFields: "name, status , owner" }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { return: { fields: ["name", "status", "owner"] } } });
});

Deno.test("entity-search: an empty returnFields adds no return key", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ returnFields: "  " }, ctx);
  assertEquals(bodyOf(calls[0]), { data: {} });
});

Deno.test("entity-search: the cursor is a query parameter, not part of the body", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ pageCursor: "cur-9" }, ctx);
  assertEquals(queryOf(calls[0].url), { pageCursor: "cur-9" });
});
