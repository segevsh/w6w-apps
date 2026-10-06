import { assert, assertEquals, assertRejects } from "@std/assert";
import uploadCreate from "../../actions/upload-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("upload-create: sends POST /v2/projects/project%201%2Fx/uploads", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "file": "v_file",
    "fileName": "v_fileName",
    "fileFormat": "v_fileFormat",
    "localeId": "v_localeId",
    "branch": "v_branch",
    "tags": "a,b",
    "updateTranslations": true,
    "updateTranslationKeys": true,
    "updateDescriptions": true,
    "skipUploadTags": true,
    "skipUnverification": true,
    "autotranslate": true,
    "markReviewed": true,
  };
  const out = await uploadCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/uploads");
  assertEquals(new URL(calls[0].url).search, "");
  const form = calls[0].form!;
  const file = form.get("file") as File;
  assertEquals(file.name, "v_fileName");
  assertEquals(await file.text(), "v_file");
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k !== "file") fields[k] = String(v);
  assertEquals(fields, {
    "file_format": "v_fileFormat",
    "locale_id": "v_localeId",
    "branch": "v_branch",
    "tags": "a,b",
    "update_translations": "true",
    "update_translation_keys": "true",
    "update_descriptions": "true",
    "skip_upload_tags": "true",
    "skip_unverification": "true",
    "autotranslate": "true",
    "mark_reviewed": "true",
  });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("upload-create: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await uploadCreate.execute({
      "projectId": "project 1/x",
      "file": "v_file",
      "fileName": "v_fileName",
      "fileFormat": "v_fileFormat",
      "localeId": "v_localeId",
      "branch": "v_branch",
      "tags": "a,b",
      "updateTranslations": true,
      "updateTranslationKeys": true,
      "updateDescriptions": true,
      "skipUploadTags": true,
      "skipUnverification": true,
      "autotranslate": true,
      "markReviewed": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("upload-create: declares key, type and every param it reads", () => {
  assertEquals(uploadCreate.key, "upload-create");
  assertEquals(uploadCreate.type, "perform");
  const declared = new Set((uploadCreate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "file": "v_file",
      "fileName": "v_fileName",
      "fileFormat": "v_fileFormat",
      "localeId": "v_localeId",
      "branch": "v_branch",
      "tags": "a,b",
      "updateTranslations": true,
      "updateTranslationKeys": true,
      "updateDescriptions": true,
      "skipUploadTags": true,
      "skipUnverification": true,
      "autotranslate": true,
      "markReviewed": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
