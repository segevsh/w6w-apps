import { assertEquals } from "@std/assert";
import action from "../../actions/list-dubbing-destination-languages.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("list-dubbing-destination-languages: GETs the murfdub path and counts", async () => {
  const languages = [{ locale: "fr_FR", language: "French", supports: ["AUTOMATED", "QA"] }];
  const { ctx, calls } = mockCtx([{ body: languages }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/list-destination-languages");
  assertEquals(out, { languages, count: 1 });
});

Deno.test("list-dubbing-destination-languages: a non-array body fails", async () => {
  assertEquals(
    (await failure(action, {}, mockCtx([{ body: { a: 1 } }]).ctx)).includes("unexpected"),
    true,
  );
});
