import { assertEquals } from "@std/assert";
import action from "../../actions/form-get.ts";
import { envelope, exec, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-get: gets by id and returns the form", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 15689, name: "Gala" }) }]);
  const out = await exec(action, { formId: "15689" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/forms/15689");
  assertEquals(calls[0].url.includes("expand"), false);
  assertEquals(out.form, { id: 15689, name: "Gala" });
});

Deno.test("form-get: inventory adds the []expand parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1 }) }]);
  await exec(action, { formId: "1", inventory: true }, ctx);
  assertEquals(queryOf(calls[0].url)["[]expand"], "inventory");
  assertEquals(new URL(calls[0].url).search, "?%5B%5Dexpand=inventory");
});
