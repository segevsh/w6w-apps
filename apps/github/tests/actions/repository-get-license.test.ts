import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repository-get-license.ts";

Deno.test("repository-get-license: GETs the license route", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "LICENSE" } }]);
  await action.execute({ owner: "acme", repository: "api" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/license");
});
