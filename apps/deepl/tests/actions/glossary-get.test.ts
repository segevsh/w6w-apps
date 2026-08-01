import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/glossary-get.ts";

Deno.test("glossary-get: GETs /v2/glossaries/{id} and maps the entry", async () => {
  const body = {
    glossary_id: "g1",
    name: "Legal",
    ready: true,
    source_lang: "EN",
    target_lang: "DE",
    creation_time: "2026-01-01T00:00:00Z",
    entry_count: 42,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ glossaryId: "g1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/glossaries/g1");
  assertEquals(result, {
    glossaryId: "g1",
    name: "Legal",
    ready: true,
    sourceLang: "EN",
    targetLang: "DE",
    creationTime: "2026-01-01T00:00:00Z",
    entryCount: 42,
  });
});
