import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/row-update.ts";

Deno.test("row-update: marked idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("row-update: PUTs with CONFIG.columns/criteria and the org header", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Update row",
        data: { updatedColumns: { Region: "East" }, updatedRows: 27, invalidColumns: {} },
      },
    },
  ]);
  const out = await action.execute(
    {
      workspaceId: "1",
      viewId: "2",
      columns: { Region: "East" },
      criteria: "\"Region\"='West'",
      organizationId: "671712892",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/views/2/rows");
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), {
    columns: { Region: "East" },
    criteria: "\"Region\"='West'",
  });
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out, { updatedColumns: { Region: "East" }, updatedRows: 27, invalidColumns: {} });
});

Deno.test("row-update: updateAllRows and addIfNotExist are only sent when explicitly set", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Update row",
        data: { updatedColumns: {}, updatedRows: 5, invalidColumns: {} },
      },
    },
  ]);
  await action.execute(
    { workspaceId: "1", viewId: "2", columns: { a: 1 }, updateAllRows: true, addIfNotExist: false },
    ctx,
  );
  const url = new URL(calls[0].url);
  const config = JSON.parse(url.searchParams.get("CONFIG")!);
  assertEquals(config.updateAllRows, true);
  assertEquals(config.addIfNotExist, false);
  assertEquals(config.criteria, undefined);
});
