import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/form-list.ts";

Deno.test("form-list: GETs /meta/<owner>/<app>/forms", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { code: 3000, forms: [{ link_name: "Orders", display_name: "Add Order" }] } },
  ]);
  const out = await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/creator/v2/meta/jason18/zylker-store/forms");
  assertEquals(out, { forms: [{ link_name: "Orders", display_name: "Add Order" }] });
});

Deno.test("form-list: URL-encodes owner/app names", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, forms: [] } }]);
  await action.execute({ accountOwnerName: "a b", appLinkName: "c/d" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/creator/v2/meta/a%20b/c%2Fd/forms");
});

Deno.test("form-list: sends the environment header when set", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, forms: [] } }]);
  await action.execute(
    { accountOwnerName: "jason18", appLinkName: "zylker-store", environment: "stage" },
    ctx,
  );
  assertEquals(calls[0].headers["environment"], "stage");
});
