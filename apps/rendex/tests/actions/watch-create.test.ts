import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import watchCreate from "../../actions/watch-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

const ok = () => mockCtx([{ body: envelope({ id: "w1" }) }]);

test("watch-create: POSTs /watches with the documented fields", async () => {
  const { ctx, calls } = ok();
  await watchCreate.execute({
    url: "https://stripe.com/pricing",
    intervalMinutes: 180,
    diffMode: "text",
    paused: false,
    renderParams: '{"selector":".price"}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/watches");
  assertEquals(bodyOf(calls[0]), {
    url: "https://stripe.com/pricing",
    intervalMinutes: 180,
    diffMode: "text",
    paused: false,
    renderParams: { selector: ".price" },
  });
  await assertRejects(
    async () => await watchCreate.execute({ url: "" }, ctx),
    Error,
    "URL is required",
  );
});
