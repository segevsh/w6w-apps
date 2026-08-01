import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/glossary-list.ts";

Deno.test("glossary-list: GETs /v2/glossaries and maps each entry", async () => {
  const body = {
    glossaries: [
      {
        glossary_id: "g1",
        name: "Legal",
        ready: true,
        source_lang: "EN",
        target_lang: "DE",
        creation_time: "2026-01-01T00:00:00Z",
        entry_count: 42,
      },
    ],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/glossaries");
  assertEquals(result.glossaries, [
    {
      glossaryId: "g1",
      name: "Legal",
      ready: true,
      sourceLang: "EN",
      targetLang: "DE",
      creationTime: "2026-01-01T00:00:00Z",
      entryCount: 42,
    },
  ]);
});
