import { assertEquals, assertRejects } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/record-list.ts";
import { ZohoCreatorApiError } from "../../lib/client.ts";

Deno.test("record-list: GETs /data/<owner>/<app>/report/<report> with from/limit/criteria", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { code: 3000, data: [{ ID: "1", Email: "a@b.com" }] } },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "All_Orders",
      from: 50,
      limit: 100,
      criteria: 'Single_Line.contains("hi")',
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/creator/v2/data/jason18/zylker-store/report/All_Orders");
  assertEquals(url.searchParams.get("from"), "50");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("criteria"), 'Single_Line.contains("hi")');
  assertEquals(out, { records: [{ ID: "1", Email: "a@b.com" }] });
});

Deno.test("record-list: sends environment/demo_user_name headers when set", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, data: [] } }]);
  await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "All_Orders",
      environment: "development",
      demoUserName: "demouser_1",
    },
    ctx,
  );
  assertEquals(calls[0].headers["environment"], "development");
  assertEquals(calls[0].headers["demo_user_name"], "demouser_1");
});

/**
 * `status-codes.html` documents a criteria matching nothing as `404 {"code":3100,
 * "description":"No records found for the given criteria."}` — a real, non-error
 * outcome, folded into an empty array rather than thrown.
 */
Deno.test("record-list: a code-3100 404 (no records found) is an empty array, not a thrown error", async () => {
  const { ctx } = mockCreatorCtx([
    { status: 404, body: { code: 3100, description: "No records found for the given criteria." } },
  ]);
  const out = await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store", reportLinkName: "All_Orders" },
    ctx,
  );
  assertEquals(out, { records: [] });
});

Deno.test("record-list: any other error still throws", async () => {
  const { ctx } = mockCreatorCtx([
    { status: 401, body: { code: 1030, description: "Authorization Failure." } },
  ]);
  const err = await assertRejects(
    async () =>
      await action.execute(
        { accountOwnerName: "jason18", appLinkName: "zylker-store", reportLinkName: "All_Orders" },
        ctx,
      ),
    ZohoCreatorApiError,
  );
  assertEquals(err.code, 1030);
});
