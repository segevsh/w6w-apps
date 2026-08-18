import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/settings-update.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("settings-update: PATCHes only the settings that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { taskUid: 5 } }], conn);
  await action.execute!({ filterableAttributes: "genres, year", stopWords: "" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/settings");
  assertEquals(JSON.parse(calls[0].body!), { filterableAttributes: ["genres", "year"] });
});

/** Ranking rules are ordered, so the comma list must keep its order. */
Deno.test("settings-update: ordered settings keep their order", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }], conn);
  await action.execute!({ rankingRules: "words, typo, proximity, sort" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).rankingRules, ["words", "typo", "proximity", "sort"]);
});

Deno.test("settings-update: JSON settings pass through as objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }], conn);
  await action.execute!({
    synonyms: '{"film":["movie"]}',
    typoTolerance: '{"enabled":false}',
    extra: '{"distinctAttribute":"sku"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.synonyms, { film: ["movie"] });
  assertEquals(body.typoTolerance, { enabled: false });
  assertEquals(body.distinctAttribute, "sku");
});

Deno.test("settings-update: an update with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

/** A filter naming a non-filterable attribute fails rather than being ignored. */
Deno.test("settings-update: the filterable hint says a filter fails without it", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "filterableAttributes")!;
  assert(param.hint!.includes("FAILS"), param.hint);
});
