import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/report-list.ts";

Deno.test("report-list: GETs /meta/<owner>/<app>/reports", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { code: 3000, reports: [{ link_name: "All_Orders", display_name: "List Report" }] } },
  ]);
  const out = await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/creator/v2/meta/jason18/zylker-store/reports");
  assertEquals(out, { reports: [{ link_name: "All_Orders", display_name: "List Report" }] });
});

Deno.test("report-list: defaults to an empty array when the body carries none", async () => {
  const { ctx } = mockCreatorCtx([{ body: { code: 3000 } }]);
  const out = await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store" },
    ctx,
  );
  assertEquals(out, { reports: [] });
});

Deno.test("report-list: sends the environment header when set", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, reports: [] } }]);
  await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store", environment: "development" },
    ctx,
  );
  assertEquals(calls[0].headers["environment"], "development");
});
