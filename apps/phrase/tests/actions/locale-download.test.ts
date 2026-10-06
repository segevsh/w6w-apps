import { assert, assertEquals, assertRejects } from "@std/assert";
import localeDownload from "../../actions/locale-download.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("locale-download: sends GET /v2/projects/project%201%2Fx/locales/locale%201%2Fx/download", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "text/plain" },
    body: "file-body",
  }]);
  const input = {
    "projectId": "project 1/x",
    "localeId": "locale 1/x",
    "fileFormat": "v_fileFormat",
    "branch": "v_branch",
    "tags": "a,b",
    "includeEmptyTranslations": true,
    "includeUnverifiedTranslations": true,
    "fallbackLocaleId": "v_fallbackLocaleId",
    "useLocaleFallback": true,
    "updatedSince": "2026-01-01T00:00:00Z",
    "encoding": "UTF-8",
  };
  const out = await localeDownload.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/projects/project%201%2Fx/locales/locale%201%2Fx/download",
  );
  assertEquals(queryOf(calls[0].url), {
    "file_format": "v_fileFormat",
    "branch": "v_branch",
    "tags": "a,b",
    "include_empty_translations": "true",
    "include_unverified_translations": "true",
    "fallback_locale_id": "v_fallbackLocaleId",
    "use_locale_fallback": "true",
    "updated_since": "2026-01-01T00:00:00Z",
    "encoding": "UTF-8",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out.content, "file-body");
  assertEquals(out.contentType, "text/plain");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("locale-download: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await localeDownload.execute({
      "projectId": "project 1/x",
      "localeId": "locale 1/x",
      "fileFormat": "v_fileFormat",
      "branch": "v_branch",
      "tags": "a,b",
      "includeEmptyTranslations": true,
      "includeUnverifiedTranslations": true,
      "fallbackLocaleId": "v_fallbackLocaleId",
      "useLocaleFallback": true,
      "updatedSince": "2026-01-01T00:00:00Z",
      "encoding": "UTF-8",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("locale-download: declares key, type and every param it reads", () => {
  assertEquals(localeDownload.key, "locale-download");
  assertEquals(localeDownload.type, "read");
  const declared = new Set((localeDownload.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "localeId": "locale 1/x",
      "fileFormat": "v_fileFormat",
      "branch": "v_branch",
      "tags": "a,b",
      "includeEmptyTranslations": true,
      "includeUnverifiedTranslations": true,
      "fallbackLocaleId": "v_fallbackLocaleId",
      "useLocaleFallback": true,
      "updatedSince": "2026-01-01T00:00:00Z",
      "encoding": "UTF-8",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});

Deno.test("locale-download: returns the file text verbatim, not parsed JSON", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "application/json", etag: 'W/"abc"' },
    body: '{"a":1}',
  }]);
  const out = await localeDownload.execute({
    "projectId": "project 1/x",
    "localeId": "locale 1/x",
    "fileFormat": "v_fileFormat",
    "branch": "v_branch",
    "tags": "a,b",
    "includeEmptyTranslations": true,
    "includeUnverifiedTranslations": true,
    "fallbackLocaleId": "v_fallbackLocaleId",
    "useLocaleFallback": true,
    "updatedSince": "2026-01-01T00:00:00Z",
    "encoding": "UTF-8",
  }, ctx) as Record<string, unknown>;
  assertEquals(out.content, '{"a":1}');
  assertEquals(out.etag, 'W/"abc"');
});
