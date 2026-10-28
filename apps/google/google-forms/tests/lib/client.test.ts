import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  batchUpdate,
  buildWriteControl,
  deriveUpdateMask,
  extractFormId,
  FORM_MIME_TYPE,
  GoogleFormsClient,
  singleRequestBody,
} from "../../lib/client.ts";

Deno.test("client: resolves relative paths against forms.googleapis.com/v1", async () => {
  const { ctx, calls } = mockCtx([{ body: { formId: "f1" } }]);
  await new GoogleFormsClient(ctx).request("/forms/f1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://forms.googleapis.com");
  assertEquals(url.pathname, "/v1/forms/f1");
});

Deno.test("client: routes /drive/... paths to www.googleapis.com", async () => {
  const { ctx, calls } = mockCtx([{ body: { files: [] } }]);
  await new GoogleFormsClient(ctx).request("/drive/v3/files", { query: { q: "x" } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/drive/v3/files");
  assertEquals(url.searchParams.get("q"), "x");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const result = await new GoogleFormsClient(ctx).request("/forms/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":{"status":"NOT_FOUND"}}' },
  ]);
  const err = await assertRejects(
    () => new GoogleFormsClient(ctx).request("/forms/missing"),
    Error,
    "Google Forms 404",
  );
  assertEquals(err.message.includes("/v1/forms/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleFormsClient(ctx).request("/forms/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new GoogleFormsClient(ctx).request("/forms", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("extractFormId: pulls the id out of an editor URL", () => {
  assertEquals(
    extractFormId("https://docs.google.com/forms/d/1AbC-dEf_123/edit"),
    "1AbC-dEf_123",
  );
});

Deno.test("extractFormId: leaves a bare id untouched", () => {
  assertEquals(extractFormId("1AbC-dEf_123"), "1AbC-dEf_123");
});

Deno.test("extractFormId: does not mistake a responder /d/e/ URL for a form id", () => {
  const responder = "https://docs.google.com/forms/d/e/1FAIpQLSc_xyz/viewform";
  assertEquals(extractFormId(responder), responder);
});

Deno.test("buildWriteControl: prefers targetRevisionId, omits when neither is given", () => {
  assertEquals(buildWriteControl("t1", "r1"), { targetRevisionId: "t1" });
  assertEquals(buildWriteControl(undefined, "r1"), { requiredRevisionId: "r1" });
  assertEquals(buildWriteControl(undefined, undefined), undefined);
});

Deno.test("singleRequestBody: wraps one request and omits empty envelope keys", () => {
  assertEquals(singleRequestBody({ deleteItem: { location: { index: 0 } } }), {
    requests: [{ deleteItem: { location: { index: 0 } } }],
  });
});

Deno.test("singleRequestBody: carries includeFormInResponse and writeControl", () => {
  const body = singleRequestBody({ moveItem: {} }, {
    includeFormInResponse: true,
    requiredRevisionId: "rev-9",
  });
  assertEquals(body.includeFormInResponse, true);
  assertEquals(body.writeControl, { requiredRevisionId: "rev-9" });
});

Deno.test("deriveUpdateMask: honours an explicit mask", () => {
  assertEquals(deriveUpdateMask(" * ", { title: "x" }), "*");
});

Deno.test("deriveUpdateMask: derives from the supplied keys", () => {
  assertEquals(deriveUpdateMask(undefined, { title: "x", description: "y" }), "title,description");
});

Deno.test("deriveUpdateMask: ignores undefined values and throws when nothing is set", () => {
  assertEquals(deriveUpdateMask(undefined, { title: "x", description: undefined }), "title");
  assertThrows(() => deriveUpdateMask(undefined, {}), Error, "updateMask is required");
});

Deno.test("batchUpdate: POSTs to the :batchUpdate suffix on the normalised form id", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [] } }]);
  await batchUpdate(ctx, "https://docs.google.com/forms/d/form-7/edit", { requests: [{}] });
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/forms/form-7:batchUpdate");
});

Deno.test("FORM_MIME_TYPE is Drive's Google Forms mime type", () => {
  assertEquals(FORM_MIME_TYPE, "application/vnd.google-apps.form");
});
