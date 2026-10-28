import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/application-list.ts";

Deno.test("application-list: GETs /meta/applications with no owner/app in the path", async () => {
  const { ctx, calls } = mockCreatorCtx([
    {
      body: {
        code: 3000,
        applications: [{ link_name: "zylker-store", workspace_name: "jason18" }],
      },
    },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/creator/v2/meta/applications");
  assertEquals(out, { applications: [{ link_name: "zylker-store", workspace_name: "jason18" }] });
});

Deno.test("application-list: defaults to an empty array when the body carries none", async () => {
  const { ctx } = mockCreatorCtx([{ body: { code: 3000 } }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { applications: [] });
});

Deno.test("application-list: takes no params", () => {
  assertEquals(action.params, []);
});
