import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/field-list.ts";

Deno.test("field-list: GETs /meta/<owner>/<app>/form/<form>/fields", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { code: 3000, fields: [{ link_name: "Email", type: 3 }] } },
  ]);
  const out = await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store", formLinkName: "Orders" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/creator/v2/meta/jason18/zylker-store/form/Orders/fields");
  assertEquals(out, { fields: [{ link_name: "Email", type: 3 }] });
});

Deno.test("field-list: defaults to an empty array when the body carries none", async () => {
  const { ctx } = mockCreatorCtx([{ body: { code: 3000 } }]);
  const out = await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store", formLinkName: "Orders" },
    ctx,
  );
  assertEquals(out, { fields: [] });
});

Deno.test("field-list: sends the environment header when set", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, fields: [] } }]);
  await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      formLinkName: "Orders",
      environment: "development",
    },
    ctx,
  );
  assertEquals(calls[0].headers["environment"], "development");
});
