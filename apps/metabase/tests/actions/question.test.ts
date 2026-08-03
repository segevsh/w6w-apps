import { assert, assertEquals, assertRejects } from "@std/assert";
import questionRun from "../../actions/question-run.ts";
import questionExport from "../../actions/question-export.ts";
import questionList from "../../actions/question-list.ts";
import questionGet from "../../actions/question-get.ts";
import questionCreate from "../../actions/question-create.ts";
import questionUpdate from "../../actions/question-update.ts";
import { mockMetabaseCtx, queryOk, SITE_URL } from "../_helpers.ts";

Deno.test("question-run: POSTs to the card query path and returns the envelope", async () => {
  const { ctx, calls } = mockMetabaseCtx([queryOk([[1, 2]])]);
  const result = await questionRun.execute({ cardId: 40 }, ctx) as { status: string };
  assertEquals(result.status, "completed");
  assertEquals(calls[0].url, `${SITE_URL}/api/card/40/query`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { ignore_cache: false });
});

Deno.test("question-run: forwards parameters, parsing a JSON string if that is what arrived", async () => {
  const params = [{
    type: "category",
    value: ["Widget"],
    target: ["dimension", ["template-tag", "c"]],
  }];
  for (const supplied of [params, JSON.stringify(params)]) {
    const { ctx, calls } = mockMetabaseCtx([queryOk()]);
    await questionRun.execute({ cardId: 7, parameters: supplied, ignoreCache: true }, ctx);
    assertEquals(JSON.parse(calls[0].body!), { parameters: params, ignore_cache: true });
  }
});

Deno.test("question-run: a failed query throws instead of returning empty rows", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 202,
    body: { status: "failed", row_count: 0, error: "boom", error_type: "invalid-query" },
  }]);
  await assertRejects(
    async () => await questionRun.execute({ cardId: 1 }, ctx),
    Error,
    "query failed",
  );
});

Deno.test("question-export: hits the format path and returns the body verbatim", async () => {
  const { ctx, calls } = mockMetabaseCtx([{
    status: 200,
    body: "one,two\n1,2\n",
    headers: { "content-type": "text/csv" },
  }]);
  const out = await questionExport.execute({ cardId: 40, format: "csv" }, ctx) as {
    format: string;
    content: string;
  };
  assertEquals(out, { format: "csv", content: "one,two\n1,2\n" });
  assertEquals(calls[0].url, `${SITE_URL}/api/card/40/query/csv`);
  assertEquals(JSON.parse(calls[0].body!), { format_rows: false });
});

Deno.test("question-export: defaults to csv and to unformatted rows", async () => {
  // `format_rows: true` turns 1234.5 into the string "1,234.5", which breaks
  // arithmetic downstream. Verified on the wire; the default must stay off.
  const { ctx, calls } = mockMetabaseCtx([{ status: 200, body: "a\n1\n" }]);
  const out = await questionExport.execute({ cardId: 1 }, ctx) as { format: string };
  assertEquals(out.format, "csv");
  assertEquals(calls[0].url.endsWith("/query/csv"), true);
  assertEquals(JSON.parse(calls[0].body!).format_rows, false);
});

Deno.test("question-export: the format enum excludes `api`, which is not an export", () => {
  const opts = questionExport.params!.find((p) => p.key === "format")!.options as Array<
    { value: string }
  >;
  assertEquals(opts.map((o) => o.value), ["csv", "json", "xlsx"]);
});

Deno.test("question-list: sends f and model_id, and nothing when unset", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: [] }, { body: [] }]);
  await questionList.execute({ f: "using_model", modelId: 12 }, ctx);
  let url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/card");
  assertEquals(url.searchParams.get("f"), "using_model");
  assertEquals(url.searchParams.get("model_id"), "12");

  await questionList.execute({}, ctx);
  url = new URL(calls[1].url);
  assertEquals(url.search, "");
});

Deno.test("question-get: takes a string id so a NanoID entity id survives", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { id: 40 } }, { body: { id: 40 } }]);
  await questionGet.execute({ cardId: 40 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/api/card/40`);

  await questionGet.execute({ cardId: "s8D1NOosQo5TocK6qu0Gw" }, ctx);
  assertEquals(calls[1].url, `${SITE_URL}/api/card/s8D1NOosQo5TocK6qu0Gw`);
  assertEquals(questionGet.params!.find((p) => p.key === "cardId")!.type, "string");
});

/**
 * `visualization_settings` is one of the four fields Metabase marks REQUIRED on
 * `POST /api/card`, and it is the one nobody expects. Omitting it is a 400.
 */
Deno.test("question-create: sends visualization_settings even when the caller omits it", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { id: 41 } }]);
  await questionCreate.execute({
    name: "Revenue",
    datasetQuery: { database: 1, type: "native", native: { query: "SELECT 1" } },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Revenue");
  assertEquals(body.display, "table");
  assertEquals(body.visualization_settings, {});
  assertEquals(body.dataset_query.type, "native");
  assertEquals(calls[0].method, "POST");
});

Deno.test("question-create: omits collection_id entirely so the question lands at the root", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: {} }]);
  await questionCreate.execute({ name: "x", datasetQuery: "{}" }, ctx);
  assertEquals("collection_id" in JSON.parse(calls[0].body!), false);
});

Deno.test("question-create: is declared non-idempotent, because Metabase does not dedupe", () => {
  assertEquals(questionCreate.idempotent, false);
});

/**
 * `PUT /api/card/{id}` declares no required fields and applies only the keys
 * present, so a single-key body is a complete request.
 */
Deno.test("question-update: a lone archived:true does not blank the rest of the question", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { id: 40, archived: true } }]);
  await questionUpdate.execute({ cardId: 40, archived: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${SITE_URL}/api/card/40`);
  assertEquals(JSON.parse(calls[0].body!), { archived: true });
});

/**
 * The reason `archived` is not run through the blank-dropping helper: `false` is
 * how a question is restored from Trash, and dropping it would make un-archiving
 * impossible to express.
 */
Deno.test("question-update: archived:false survives, so un-archiving works", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: {} }]);
  await questionUpdate.execute({ cardId: 40, archived: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { archived: false });
});

Deno.test("question-update: untouched fields are absent, not empty strings", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: {} }]);
  await questionUpdate.execute({ cardId: 40, name: "New name", description: "" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "New name" });
  assertEquals("description" in body, false, "a blank field must not overwrite a real value");
});

Deno.test("question-update: is declared idempotent", () => {
  assertEquals(questionUpdate.idempotent, true);
});

Deno.test("question actions: bad JSON in a query param fails with a clear message", async () => {
  const { ctx } = mockMetabaseCtx([]);
  const err = await assertRejects(
    async () => await questionCreate.execute({ name: "x", datasetQuery: "{not json" }, ctx),
    Error,
  );
  assert(err.message.includes("not valid JSON"));
});
