import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, errorBody, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/view-get.ts";

Deno.test("view-get: GETs a view by id at workspace level", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ id: "v1", columns: [] }) }]);
  const out = await action.execute({ viewId: "v1" }, ctx);
  assertEquals(out.view, { id: "v1", columns: [] });
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/views/v1`);
});

Deno.test("view-get: a 404 is an error", async () => {
  const { ctx } = connCtx([{ status: 404, body: errorBody("View not found") }]);
  await assertRejects(
    async () => await action.execute({ viewId: "zz" }, ctx),
    Error,
    "View not found",
  );
});
