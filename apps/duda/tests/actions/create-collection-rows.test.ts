import { assert, assertEquals } from "@std/assert";
import { EU, mockConnectedCtx } from "../_helpers.ts";
import action from "../../actions/create-collection-rows.ts";

Deno.test("create-collection-rows: POSTs the raw array as the body, unwrapped", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: [{ id: "row-1" }, { id: "row-2" }] }], "EU");
  const rows = [
    { data: { Name: "Ada", Email: "ada@acme.com" } },
    { data: { Name: "Grace" } },
  ];
  const result = await action.execute!(
    { siteName: "abc1234d", collectionName: "Team", rows },
    ctx,
  ) as Array<{ id: string }>;

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${EU}/api/sites/multiscreen/abc1234d/collection/Team/row`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  // The request body IS the array — no envelope around it.
  assertEquals(JSON.parse(calls[0].body!), rows);
  assertEquals(result.map((r) => r.id), ["row-1", "row-2"]);
});

Deno.test("create-collection-rows: accepts the rows as JSON text too", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: [{ id: "row-1" }] }]);
  await action.execute!(
    { siteName: "abc", collectionName: "Team", rows: '[{"data":{"Name":"Ada"}}]' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), [{ data: { Name: "Ada" } }]);
});

Deno.test("create-collection-rows: refuses a non-array before spending a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  const err = await Promise.resolve(action.execute!(
    { siteName: "abc", collectionName: "Team", rows: { data: { Name: "Ada" } } },
    ctx,
  )).catch((e: Error) => e);

  assert(err instanceof Error);
  assert(/non-empty JSON array/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("create-collection-rows: is not idempotent — a retry creates the rows twice", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});

Deno.test("create-collection-rows: the hint ties `data` keys to the collection's fields", () => {
  const rows = action.params!.find((p) => p.key === "rows");
  assertEquals(rows?.type, "json");
  assertEquals(rows?.required, true);
  assert(/field names/.test(rows!.hint!), rows!.hint);
  assert(rows!.hint!.includes('[{"data"') || rows!.hint!.includes('[{ "data"'), rows!.hint);
});
