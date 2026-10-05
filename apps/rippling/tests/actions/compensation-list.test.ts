import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { API_ROOT, errorBody, listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import compensationList from "../../actions/compensation-list.ts";

const NEXT = `${API_ROOT}/compensations/?cursor=abc%3D&limit=2`;

Deno.test("compensation-list: GETs /compensations/ with every query parameter and shapes the page", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: listBody([{ id: "r1" }], NEXT, {
        __meta: {
          redacted_fields: [{ name: "date_of_birth", reason: "Insufficient entitlements" }],
        },
      }),
    },
  ]);
  const out = await compensationList.execute({
    limit: 2,
    cursor: "prev-cursor",
    orderBy: "created_at desc",
    expand: "worker",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/compensations/");
  assertEquals(queryOf(calls[0].url), {
    limit: "2",
    cursor: "prev-cursor",
    order_by: "created_at desc",
    expand: "worker",
  });
  assertEquals(out.results, [{ id: "r1" }]);
  assertEquals(out.nextCursor, "abc=");
  assertEquals(out.nextLink, NEXT);
  assertEquals(out.redactedFields, [{
    name: "date_of_birth",
    reason: "Insufficient entitlements",
  }]);
});

Deno.test("compensation-list: last page has a null cursor and sends no stray parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  const out = await compensationList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.results, []);
  assertEquals(out.nextCursor, null);
  assertEquals(out.redactedFields, []);
});

Deno.test("compensation-list: a pasted next_link URL is reduced to its cursor, never fetched", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  await compensationList.execute({ cursor: NEXT }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/compensations/");
  assertEquals(queryOf(calls[0].url), { cursor: "abc=" });
});

Deno.test("compensation-list: sends no credential (sign owns it) and declares its scope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  await compensationList.execute({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].url.startsWith(API_ROOT + "/"), true);
  assertStringIncludes(compensationList.description ?? "", "compensations.read");
  assertEquals(compensationList.type, "read");
  assert(compensationList.params!.some((p) => p.key === "limit" && p.validation?.max === 100));
});

Deno.test("compensation-list: a 403 surfaces Rippling's message, the status and the scope hint", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("Insufficient oauth scopes to access compensation"),
      headers: { "content-type": "application/json", "x-rippling-request-id": "Root=1-abc" },
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve().then(() => compensationList.execute({}, ctx)),
    Error,
  );
  assertStringIncludes(err.message, "403");
  assertStringIncludes(err.message, "Insufficient oauth scopes");
  assertStringIncludes(err.message, "Root=1-abc");
});
