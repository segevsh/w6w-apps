import { assertEquals } from "@std/assert";
import action from "../../actions/create-dubbing-project.ts";
import { bodyOf, exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("create-dubbing-project: POSTs a JSON body with snake_case keys and a locale array", async () => {
  const reply = { project_id: "p1", dubbing_type: "QA", target_locales: ["fr_FR", "de_DE"] };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, {
    name: " Promo ",
    dubbingType: "QA",
    targetLocales: "fr_FR\nde_DE",
    sourceLocale: "en_US",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/projects/create");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    name: "Promo",
    dubbing_type: "QA",
    target_locales: ["fr_FR", "de_DE"],
    source_locale: "en_US",
  });
  assertEquals(out, reply);
});

Deno.test("create-dubbing-project: validates input before calling", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    (await failure(action, { name: "", dubbingType: "QA", targetLocales: "a" }, ctx)).includes(
      "name",
    ),
    true,
  );
  assertEquals(
    (await failure(action, { name: "n", dubbingType: "", targetLocales: "a" }, ctx)).includes(
      "dubbingType",
    ),
    true,
  );
  assertEquals(
    (await failure(action, { name: "n", dubbingType: "QA", targetLocales: "" }, ctx)).includes(
      "targetLocales",
    ),
    true,
  );
  assertEquals(calls.length, 0);
});
