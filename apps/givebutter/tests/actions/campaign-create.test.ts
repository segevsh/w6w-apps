import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import campaignCreate from "../../actions/campaign-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("campaign-create: POSTs the compacted body to /campaigns", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", slug: "gala" }) }]);
  await campaignCreate.execute({ type: "fundraise", title: "Gala", slug: "gala" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/campaigns");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { type: "fundraise", title: "Gala", slug: "gala" });
});

test("campaign-create: settings JSON is parsed into an array before sending", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await campaignCreate.execute(
    {
      type: "general",
      title: "T",
      slug: "t",
      settings: '[{"name":"theme_color","value":"#112233"}]',
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.settings, [{ name: "theme_color", value: "#112233" }]);
});
