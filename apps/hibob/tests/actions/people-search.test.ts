import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import peopleSearch from "../../actions/people-search.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("people-search: POSTs /v1/people/search and returns employees + count", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [{ id: "1" }, { id: "2" }] } }]);
  const out = await peopleSearch.execute({ fields: ["root.id", "root.email"] }, ctx) as {
    employees: unknown[];
    count: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/people/search");
  assertEquals(bodyOf(calls[0]), { fields: ["root.id", "root.email"] });
  assertEquals(out.count, 2);
});

test("people-search: omits `filters` entirely when none (filters:[] is a 400)", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [] } }]);
  await peopleSearch.execute({}, ctx);
  assertEquals("filters" in (bodyOf(calls[0]) as object), false);
});

test("people-search: id and email lists become equals filters; comma strings are split", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [] } }]);
  await peopleSearch.execute(
    { ids: "10, 20", emails: ["a@x.io"], showInactive: true, humanReadable: "REPLACE" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), {
    filters: [
      { fieldPath: "root.id", operator: "equals", values: ["10", "20"] },
      { fieldPath: "root.email", operator: "equals", values: ["a@x.io"] },
    ],
    showInactive: true,
    humanReadable: "REPLACE",
  });
});

test("people-search: refuses more than 400 field ids before calling", async () => {
  const { ctx, calls } = mockCtx();
  const fields = Array.from({ length: 401 }, (_, i) => `root.f${i}`);
  await assertRejects(() => Promise.resolve(peopleSearch.execute({ fields }, ctx)), Error, "400");
  assertEquals(calls.length, 0);
});

test("people-search: a 403 surfaces the permission hint", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "FORBIDDEN" } }]);
  const err = await assertRejects(() => Promise.resolve(peopleSearch.execute({}, ctx)), Error);
  assert(err.message.includes("403") && err.message.includes("FORBIDDEN"), err.message);
});
