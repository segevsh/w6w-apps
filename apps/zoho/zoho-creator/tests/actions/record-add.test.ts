import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/record-add.ts";

Deno.test("record-add: not idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("record-add: POSTs /data/<owner>/<app>/form/<form> with data + result switches", async () => {
  const { ctx, calls } = mockCreatorCtx([
    {
      body: {
        result: [{
          code: 3000,
          data: { ID: "1", Email: "a@b.com" },
          message: "Data Added Successfully!",
        }],
        code: 3000,
      },
    },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      formLinkName: "Orders",
      data: { Email: "a@b.com" },
      message: true,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/creator/v2/data/jason18/zylker-store/form/Orders");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { Email: "a@b.com" },
    result: { message: true, tasks: false },
  });
  assertEquals(out, {
    results: [{
      code: 3000,
      data: { ID: "1", Email: "a@b.com" },
      message: "Data Added Successfully!",
    }],
  });
});

Deno.test("record-add: accepts data as a JSON string param", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { result: [{ code: 3000, data: { ID: "1" } }], code: 3000 } },
  ]);
  await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      formLinkName: "Orders",
      data: '{"Email":"a@b.com"}',
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).data, { Email: "a@b.com" });
});

Deno.test("record-add: passes a per-record failure through in results rather than throwing", async () => {
  const { ctx } = mockCreatorCtx([
    {
      body: { result: [{ code: 3001, data: { ID: "1" }, error: ["Failed to add."] }], code: 3000 },
    },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      formLinkName: "Orders",
      data: { Email: "a@b.com" },
    },
    ctx,
  );
  assertEquals(out.results[0].code, 3001);
  assertEquals(out.results[0].error, ["Failed to add."]);
});
