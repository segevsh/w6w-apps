import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import instantUrlCreate from "../../actions/instant-url-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("instant-url-create: POST /instant_urls, surfaces the one-time signing_key", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: {
        uid: "iu1",
        base_url: "https://cdn/x",
        signing_key: "shhh-signing-key",
      },
    },
  ]);
  const out = await instantUrlCreate.execute(
    { name: "Card URL", template: "t1", security: "signed" },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/instant_urls");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Card URL",
    template: "t1",
    security: "signed",
  });
  assertEquals(out.signing_key, "shhh-signing-key");
});

test("instant-url-create: requires name and template", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => instantUrlCreate.execute({ name: "", template: "t1" }, ctx));
  await assertRejects(() => instantUrlCreate.execute({ name: "n", template: "" }, ctx));
});

test("instant-url-create: not idempotent", () => {
  assertEquals(instantUrlCreate.idempotent, false);
});
