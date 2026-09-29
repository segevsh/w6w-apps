import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/data-import-new-table.ts";

Deno.test("data-import-new-table: not idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("data-import-new-table: POSTs multipart FILE plus CONFIG, unwraps data", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Import data",
        data: {
          viewId: "1767024000003153002",
          importSummary: { totalRowCount: 101, successRowCount: 101 },
          columnDetails: { Region: "Plain Text" },
          importErrors: "",
        },
      },
    },
  ]);
  const file = new Blob(["Region,Sales\nEast,100\n"], { type: "text/csv" });
  const out = await action.execute(
    {
      workspaceId: "1",
      file,
      tableName: "Sales",
      fileType: "csv",
      autoIdentify: true,
      onError: "skiprow",
      skipTop: 1,
      organizationId: "671712892",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/data");
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), {
    tableName: "Sales",
    fileType: "csv",
    autoIdentify: true,
    onError: "skiprow",
    skipTop: 1,
  });
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(calls[0].body, "[FormData]");
  assertEquals(out, {
    viewId: "1767024000003153002",
    importSummary: { totalRowCount: 101, successRowCount: 101 },
    columnDetails: { Region: "Plain Text" },
    importErrors: "",
  });
});
