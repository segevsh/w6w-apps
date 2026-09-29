import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/workspace-list-owned.ts";

Deno.test("workspace-list-owned: GETs /workspaces/owned with no org header", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Get owned workspaces",
        data: { workspaces: [{ workspaceId: "1", orgId: "671712892" }] },
      },
    },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/restapi/v2/workspaces/owned");
  assertEquals(calls[0].headers["zanalytics-orgid"], undefined);
  assertEquals(out, { workspaces: [{ workspaceId: "1", orgId: "671712892" }] });
});

Deno.test("workspace-list-owned: defaults to an empty array when data carries none", async () => {
  const { ctx } = mockAnalyticsCtx([
    { body: { status: "success", summary: "ok", data: {} } },
  ]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { workspaces: [] });
});
