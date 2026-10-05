import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import customObjectRecordQuery from "../../actions/custom-object-record-query.ts";

Deno.test("custom-object-record-query: POSTs the query in the body and reads the bare cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: [{ id: "r1" }], cursor: "next-1" } },
  ]);
  const out = await customObjectRecordQuery.execute(
    { customObjectApiName: "asset", query: "name eq 'Laptop'", limit: 5, cursor: "c0" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/records/query/");
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(JSON.parse(calls[0].body!), { query: "name eq 'Laptop'", limit: 5, cursor: "c0" });
  assertEquals(out, { results: [{ id: "r1" }], nextCursor: "next-1" });
});

Deno.test("custom-object-record-query: is a search, tolerates an empty body, needs the api name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  const out = await customObjectRecordQuery.execute({ customObjectApiName: "asset" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { results: [], nextCursor: null });
  assertEquals(customObjectRecordQuery.type, "search");
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectRecordQuery.execute({ customObjectApiName: "" }, ctx)
      ),
    Error,
    "customObjectApiName is required",
  );
});
