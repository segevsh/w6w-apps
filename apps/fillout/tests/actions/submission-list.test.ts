import { assertEquals } from "@std/assert";
import submissionList from "../../actions/submission-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = {
  responses: [{ submissionId: "s1", submissionTime: "2026-08-01T10:00:00.000Z", questions: [] }],
  totalResponses: 1,
  pageCount: 1,
};

Deno.test("submission-list: calls GET /v1/api/forms/{id}/submissions and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await submissionList.execute({ formId: "aB1" }, ctx) as typeof page;

  assertEquals(pathOf(calls[0].url), "/v1/api/forms/aB1/submissions");
  assertEquals(out.totalResponses, 1);
  assertEquals(out.pageCount, 1);
});

Deno.test("submission-list: every documented filter reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await submissionList.execute({
    formId: "aB1",
    limit: 150,
    offset: 300,
    status: "in_progress",
    sort: "desc",
    search: "acme",
    afterDate: "2026-01-01T00:00:00.000Z",
    beforeDate: "2026-02-01T00:00:00.000Z",
    includeEditLink: true,
    includePreview: true,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    limit: "150",
    offset: "300",
    status: "in_progress",
    sort: "desc",
    search: "acme",
    afterDate: "2026-01-01T00:00:00.000Z",
    beforeDate: "2026-02-01T00:00:00.000Z",
    includeEditLink: "true",
    includePreview: "true",
  });
});

/**
 * Fillout documents both booleans as "pass true" and says nothing about how a
 * *false* is parsed. Sending `includePreview=false` would rely on undocumented
 * behaviour, so a false is expressed as absence — which is already the vendor's
 * default.
 */
Deno.test("submission-list: a false flag is omitted rather than sent as the string false", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await submissionList.execute(
    { formId: "aB1", includeEditLink: false, includePreview: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * `offset: 0` is a meaningful value, not an unset field — `compact` must not
 * drop it, or "start from the beginning" becomes unexpressible.
 */
Deno.test("submission-list: offset 0 survives compaction", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await submissionList.execute({ formId: "aB1", offset: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { offset: "0" });
});

Deno.test("submission-list: nothing is sent when only the form is given", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await submissionList.execute({ formId: "aB1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * The vendor's bounds, pinned: `limit` is 1–150 with a default of 50, and the
 * status/sort enums are exactly the two members each that Fillout documents.
 * A hand-typed wrong bound here is the sort of thing that only shows up as a
 * 400 in production.
 */
Deno.test("submission-list: params carry Fillout's documented bounds and enums", () => {
  const params = Object.fromEntries((submissionList.params ?? []).map((p) => [p.key, p]));
  assertEquals(params.limit.default, 50);
  assertEquals(params.limit.validation, { integer: true, min: 1, max: 150 });
  assertEquals(
    (params.status.options as Array<{ value: string }>).map((o) => o.value),
    ["finished", "in_progress"],
  );
  assertEquals(
    (params.sort.options as Array<{ value: string }>).map((o) => o.value),
    ["asc", "desc"],
  );
});
