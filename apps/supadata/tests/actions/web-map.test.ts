import { assertEquals, assertRejects } from "@std/assert";
import map from "../../actions/web-map.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("web-map: GETs /web/map?url= and returns the urls", async () => {
  const { ctx, calls } = mockCtx([{ body: { urls: ["https://e.test/a"] } }]);
  assertEquals(await map.execute({ url: "https://e.test" }, ctx), { urls: ["https://e.test/a"] });
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/web/map?url=https%3A%2F%2Fe.test");
});

Deno.test("web-map: a plan refusal (402) is thrown with the hint; a blank url makes no call", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { error: "upgrade-required", message: "m", details: "Upgrade" },
  }]);
  await assertRejects(
    async () => await map.execute({ url: "https://e.test" }, ctx),
    Error,
    "not on the current plan",
  );
  const none = mockCtx();
  await assertRejects(async () => await map.execute({ url: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
