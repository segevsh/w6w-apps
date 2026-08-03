import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import action from "../../actions/list-records.ts";

Deno.test("list-records: GETs the records path off the connection's site", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!({ docId: "9PJhBDZ", tableId: "People" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.host, "docs.getgrist.com");
  assertEquals(url.pathname, "/api/docs/9PJhBDZ/tables/People/records");
});

Deno.test("list-records: sends nothing it was not given", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!({ docId: "d", tableId: "T" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-records: stringifies an object filter and URL-encodes it", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!({ docId: "d", tableId: "T", filter: { pet: ["cat", "dog"] } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter"), '{"pet":["cat","dog"]}');
  // The raw query string must be percent-encoded — braces and quotes are not URL-safe.
  assert(!url.search.includes("{"), "filter JSON must be encoded, not raw");
});

Deno.test("list-records: passes a pre-serialized filter string through unchanged", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!({ docId: "d", tableId: "T", filter: '{"pet":["cat"]}' }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), '{"pet":["cat"]}');
});

Deno.test("list-records: forwards sort, limit, hidden and cellFormat", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!(
    { docId: "d", tableId: "T", sort: "pet,-age", limit: 5, hidden: true, cellFormat: "typed" },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sort"), "pet,-age");
  assertEquals(q.get("limit"), "5");
  assertEquals(q.get("hidden"), "true");
  assertEquals(q.get("cellFormat"), "typed");
});

Deno.test("list-records: limit=0 is sent, because Grist reads it as 'no limit'", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!({ docId: "d", tableId: "T", limit: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "0");
});

Deno.test("list-records: percent-encodes ids with awkward characters", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!({ docId: "a/b", tableId: "My Table" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/a%2Fb/tables/My%20Table/records");
});

Deno.test("list-records: returns the envelope, including per-record formula errors", async () => {
  const { ctx } = actionCtx([{
    body: {
      records: [
        { id: 1, fields: { pet: "cat", popularity: 67 } },
        {
          id: 2,
          fields: { pet: "dog", computed: null },
          errors: { computed: "ZeroDivisionError" },
        },
      ],
    },
  }]);
  const out = await action.execute!({ docId: "d", tableId: "T" }, ctx);
  assertEquals(out.records.length, 2);
  assertEquals(out.records[0].fields.pet, "cat");
  assertEquals(out.records[1].errors?.computed, "ZeroDivisionError");
});

Deno.test("list-records: targets a self-hosted site just as readily", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }], "https://grist.internal.example");
  await action.execute!({ docId: "d", tableId: "T" }, ctx);
  assertEquals(new URL(calls[0].url).origin, "https://grist.internal.example");
});
