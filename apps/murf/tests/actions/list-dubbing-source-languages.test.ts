import { assertEquals } from "@std/assert";
import action from "../../actions/list-dubbing-source-languages.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("list-dubbing-source-languages: GETs the murfdub path and counts", async () => {
  const languages = [{ locale: "en_US", language: "English" }];
  const { ctx, calls } = mockCtx([{ body: languages }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/list-source-languages");
  assertEquals(out, { languages, count: 1 });
});

Deno.test("list-dubbing-source-languages: a 403 fails", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error_code: 403, error_message: "Invalid 'api-key' header passed" },
  }]);
  assertEquals((await failure(action, {}, ctx)).includes("Invalid 'api-key'"), true);
});
