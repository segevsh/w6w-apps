import { assertEquals } from "@std/assert";
import action from "../../actions/registrant-get.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("registrant-get: gets the registrant by id with the product and returns it", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 42 }) }]);
  const out = await exec(action, {
    registrantId: "42",
    product: "regfox.com",
    expand: "memberships",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/public/search/registrants/42");
  assertEquals(queryOf(calls[0].url).product, "regfox.com");
  assertEquals(queryOf(calls[0].url)["[]expand"], "memberships");
  assertEquals(out.registrant, { id: 42 });
});

Deno.test("registrant-get: the id is path-encoded and required", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await exec(action, { registrantId: "a/b", product: "regfox.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/search/registrants/a%2Fb");
  assertEquals(action.params!.find((p) => p.key === "registrantId")?.required, true);
});

Deno.test("registrant-get: a 404 error envelope throws", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { responseCode: 404, error: { code: 4404, description: "not found" } },
  }]);
  let threw = false;
  try {
    await exec(action, { registrantId: "1", product: "regfox.com" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
