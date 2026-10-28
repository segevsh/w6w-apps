import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/row-add.ts";

Deno.test("row-add: POSTs with CONFIG.columns and the org header, not idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("row-add: builds CONFIG from columns and optional date-format fields", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Add row",
        data: { addedColumns: { Region: "East" }, invalidColumns: {} },
      },
    },
  ]);
  const out = await action.execute(
    {
      workspaceId: "1",
      viewId: "2",
      columns: { Region: "East", Sales: 1000 },
      dateFormat: "dd-MMM-yyyy",
      organizationId: "671712892",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/views/2/rows");
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), {
    columns: { Region: "East", Sales: 1000 },
    dateFormat: "dd-MMM-yyyy",
  });
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out, { addedColumns: { Region: "East" }, invalidColumns: {} });
});

Deno.test("row-add: accepts columns as a JSON string param", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Add row",
        data: { addedColumns: {}, invalidColumns: {} },
      },
    },
  ]);
  await action.execute(
    { workspaceId: "1", viewId: "2", columns: '{"Region":"East"}' },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), { columns: { Region: "East" } });
});
