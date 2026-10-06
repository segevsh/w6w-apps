import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-deleted-items.ts";

Deno.test("list-deleted-items: the OData cast type is part of the URI", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "u1" }] } }]);
  const out = await action.execute({ itemType: "group" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/directory/deletedItems/microsoft.graph.group",
  );
  assertEquals(out.value.length, 1);
});

Deno.test("list-deleted-items: every offered type maps to its own cast", async () => {
  for (const t of ["user", "group", "application", "servicePrincipal"]) {
    const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
    await action.execute({ itemType: t }, ctx);
    assert(calls[0].url.includes(`/directory/deletedItems/microsoft.graph.${t}`), t);
  }
});

Deno.test("list-deleted-items: an unknown type falls back to users rather than building a bad URI", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemType: "../../me" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/directory/deletedItems/microsoft.graph.user");
});

Deno.test("list-deleted-items: ordering by deletedDateTime works with advancedQuery", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute(
    { itemType: "user", orderby: "deletedDateTime desc", advancedQuery: true },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$orderby"), "deletedDateTime desc");
  assertEquals(q.get("$count"), "true");
  assertEquals(calls[0].headers.consistencylevel, "eventual");
});
