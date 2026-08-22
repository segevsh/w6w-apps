import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/work-item-query.ts";

const wiqlResult = (ids: number[]) => one({ workItems: ids.map((id) => ({ id, url: "…" })) });
const batch = (items: unknown[]) => one({ count: items.length, value: items });

/**
 * THE trap this action closes: WIQL answers with ids and no fields, whatever
 * the SELECT said.
 */
Deno.test("work-item-query: runs the query then fetches the fields", async () => {
  const { ctx, calls } = mockCtx([
    wiqlResult([101, 102]),
    batch([{ id: 101, fields: {} }, { id: 102, fields: {} }]),
  ], { display });
  const result = await action.execute!(
    { project: "P", wiql: "SELECT [System.Id] FROM WorkItems" },
    ctx,
  ) as {
    count: number;
    totalMatched: number;
    truncated: boolean;
  };
  assertEquals(calls[0].url.split("?")[0], "https://dev.azure.com/contoso/P/_apis/wit/wiql");
  assertEquals(JSON.parse(calls[0].body!), { query: "SELECT [System.Id] FROM WorkItems" });
  assertEquals(
    calls[1].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/wit/workitemsbatch",
  );
  assertEquals(JSON.parse(calls[1].body!).ids, [101, 102]);
  assertEquals(result.count, 2);
  assertEquals(result.totalMatched, 2);
  assertEquals(result.truncated, false);
});

Deno.test("work-item-query: field names are qualified for the batch call", async () => {
  const { ctx, calls } = mockCtx([wiqlResult([101]), batch([{ id: 101 }])], { display });
  await action.execute!({ project: "P", wiql: "SELECT 1", fields: "title,state" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).fields, ["System.Title", "System.State"]);
});

/** No matches means no second call at all. */
Deno.test("work-item-query: an empty result makes only one request", async () => {
  const { ctx, calls } = mockCtx([wiqlResult([])], { display });
  const result = await action.execute!({ project: "P", wiql: "SELECT 1" }, ctx) as {
    count: number;
  };
  assertEquals(calls.length, 1);
  assertEquals(result.count, 0);
});

/** The batch endpoint caps at 200, so a larger result needs several calls. */
Deno.test("work-item-query: fetches in batches of 200", async () => {
  const ids = Array.from({ length: 250 }, (_, i) => i + 1);
  const { ctx, calls } = mockCtx([
    wiqlResult(ids),
    batch(ids.slice(0, 200).map((id) => ({ id }))),
    batch(ids.slice(200).map((id) => ({ id }))),
  ], { display });
  const result = await action.execute!({ project: "P", wiql: "SELECT 1", limit: 250 }, ctx) as {
    count: number;
  };
  assertEquals(calls.length, 3);
  assertEquals(JSON.parse(calls[1].body!).ids.length, 200);
  assertEquals(JSON.parse(calls[2].body!).ids.length, 50);
  assertEquals(result.count, 250);
});

/** A report claiming 200 when the query matched 900 is worse than one that admits it. */
Deno.test("work-item-query: reports truncation rather than hiding it", async () => {
  const ids = Array.from({ length: 500 }, (_, i) => i + 1);
  const { ctx } = mockCtx([wiqlResult(ids), batch(ids.slice(0, 10).map((id) => ({ id })))], {
    display,
  });
  const result = await action.execute!({ project: "P", wiql: "SELECT 1", limit: 10 }, ctx) as {
    count: number;
    totalMatched: number;
    truncated: boolean;
  };
  assertEquals(result.totalMatched, 500);
  assertEquals(result.truncated, true);
});

Deno.test("work-item-query: needs a project and a query", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ project: "P" }, ctx), Error, "wiql");
  assertEquals(calls.length, 0);
});

Deno.test("work-item-query: is a search action and says WIQL returns ids", () => {
  assertEquals(action.type, "search");
  assert(/only IDS/.test(action.description!), action.description);
});
