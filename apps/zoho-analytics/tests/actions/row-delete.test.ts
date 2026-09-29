import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/row-delete.ts";

Deno.test("row-delete: marked idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("row-delete: DELETEs with CONFIG.criteria and the org header", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    { body: { status: "success", summary: "Delete row", data: { deletedRows: 27 } } },
  ]);
  const out = await action.execute(
    {
      workspaceId: "1",
      viewId: "2",
      criteria: "\"Region\"='East'",
      organizationId: "671712892",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/views/2/rows");
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), { criteria: "\"Region\"='East'" });
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out, { deletedRows: 27 });
});

Deno.test("row-delete: deleteAllRows is sent through when set", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    { body: { status: "success", summary: "Delete row", data: { deletedRows: 100 } } },
  ]);
  await action.execute({ workspaceId: "1", viewId: "2", deleteAllRows: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), { deleteAllRows: true });
});
