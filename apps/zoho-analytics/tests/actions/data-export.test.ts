import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/data-export.ts";

Deno.test("data-export: GETs /workspaces/<id>/views/<id>/data, returns raw content and content type", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      status: 200,
      headers: { "content-type": "text/csv;charset=UTF-8" },
      body: 'Date,Region,Sales\n"15 June, 2021",East,682.39\n',
    },
  ]);
  const out = await action.execute(
    {
      workspaceId: "1",
      viewId: "2",
      responseFormat: "csv",
      criteria: "\"Region\"='East'",
      organizationId: "671712892",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/views/2/data");
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), {
    responseFormat: "csv",
    criteria: "\"Region\"='East'",
  });
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out.contentType, "text/csv;charset=UTF-8");
  assertEquals(out.content, 'Date,Region,Sales\n"15 June, 2021",East,682.39\n');
});
