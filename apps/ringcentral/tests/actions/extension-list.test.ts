import { assertEquals } from "@std/assert";
import extensionList from "../../actions/extension-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("extension-list: hits the account-level extension collection", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await extensionList.execute({}, ctx) as { records: unknown[] };

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension");
  assertEquals(out.records, [{ id: "1" }]);
});

Deno.test("extension-list: multi-valued status/type filters repeat the query key", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await extensionList.execute(
    { status: ["Enabled", "Disabled"], type: ["User"], page: 2, perPage: 50 },
    ctx,
  );
  assertEquals(queryAllOf(calls[0].url, "status"), ["Enabled", "Disabled"]);
  assertEquals(queryAllOf(calls[0].url, "type"), ["User"]);
  assertEquals(queryOf(calls[0].url).page, "2");
  assertEquals(queryOf(calls[0].url).perPage, "50");
});

Deno.test("extension-list: omitted filters are absent from the query, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await extensionList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
