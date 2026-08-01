import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-languages.ts";

Deno.test("list-languages: GETs /v3/languages?resource=translate_text and maps fields", async () => {
  const body = [
    {
      lang: "DE",
      name: "German",
      usable_as_source: true,
      usable_as_target: true,
      status: "stable",
    },
    {
      lang: "EN-US",
      name: "English (American)",
      usable_as_source: false,
      usable_as_target: true,
      status: "stable",
    },
  ];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/languages");
  assertEquals(url.searchParams.get("resource"), "translate_text");
  assertEquals(url.searchParams.has("include"), false);
  assertEquals(result.languages, [
    { lang: "DE", name: "German", usableAsSource: true, usableAsTarget: true, status: "stable" },
    {
      lang: "EN-US",
      name: "English (American)",
      usableAsSource: false,
      usableAsTarget: true,
      status: "stable",
    },
  ]);
});

Deno.test("list-languages: includeBeta sets include=beta", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ includeBeta: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "beta");
});
