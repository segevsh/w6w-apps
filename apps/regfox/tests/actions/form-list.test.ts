import { assertEquals } from "@std/assert";
import action from "../../actions/form-list.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: product is optional, inventory becomes []expand, cursor returned", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ id: 1, status: "open" }], { hasMore: true, startingAfter: 1 }),
  }]);
  const out = await exec(action, {
    inventory: true,
    limit: 10,
    datePublishedAfter: "2026-01-01",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/forms");
  const q = queryOf(calls[0].url);
  assertEquals(q["[]expand"], "inventory");
  assertEquals(q.limit, "10");
  assertEquals(q.datePublishedAfter, "2026-01-01");
  assertEquals(q.product, undefined);
  assertEquals(out.forms, [{ id: 1, status: "open" }]);
  assertEquals(out.hasMore, true);
  assertEquals(out.startingAfter, 1);
  assertEquals(action.params!.find((p) => p.key === "product")?.required, undefined);
});

Deno.test("form-list: without inventory no expand is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await exec(action, { product: "regfox.com" }, ctx);
  assertEquals(queryOf(calls[0].url)["[]expand"], undefined);
});
