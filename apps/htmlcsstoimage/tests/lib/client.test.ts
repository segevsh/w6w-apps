import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  compact,
  encodeId,
  formatHctiError,
  HctiClient,
} from "../../lib/client.ts";
import { buildBody, buildTemplateBody } from "../../lib/render.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops unset values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("asOptionalJson / asJson: accept parsed values and typed strings", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("{nope", "metadata"), Error, "metadata is not valid JSON");
  assertThrows(() => asJson(undefined, "template_values"), Error, "template_values is required");
});

Deno.test("encodeId: neutralises path characters", () => {
  assertEquals(encodeId(" a/b?c "), "a%2Fb%3Fc");
  assertEquals(encodeId(1595179003987), "1595179003987");
});

Deno.test("client: GETs under /v1 with query, drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await new HctiClient(ctx).json("/images", { query: { count: 5, page_token: "" } });
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url.startsWith("https://hcti.io/v1/images"), true);
  assertEquals(queryOf(calls[0].url), { count: "5" });
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: POST sends a JSON body with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new HctiClient(ctx).json("/image", { method: "POST", body: { html: "<b/>" } });
  assertEquals(pathOf(calls[0].url), "/v1/image");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"html":"<b/>"}');
});

Deno.test("client: an empty 202 body yields undefined from json and the status from status()", async () => {
  const a = mockCtx([{ status: 202, body: undefined }]);
  assertEquals(await new HctiClient(a.ctx).json("/image/x", { method: "DELETE" }), undefined);
  const b = mockCtx([{ status: 202, body: undefined }]);
  assertEquals(await new HctiClient(b.ctx).status("/image/x", { method: "DELETE" }), 202);
});

Deno.test("client: errors carry the vendor's error, message, field errors and a hint", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("Bad Request", "Validation failed", 400, [
      { path: "html", message: "html is required" },
    ]),
  }]);
  const err = await assertRejects(
    () => new HctiClient(ctx).json("/image", { method: "POST", body: {} }),
    Error,
  );
  for (
    const part of [
      "400 Bad Request",
      "POST /v1/image",
      "Validation failed",
      "html: html is required",
    ]
  ) {
    assertEquals(err.message.includes(part), true, `${part} in ${err.message}`);
  }
});

Deno.test("formatHctiError: 402 and 403 get a hint, non-JSON bodies are quoted", () => {
  assertEquals(
    formatHctiError(
      402,
      "POST",
      "/v1/image",
      JSON.stringify(errorBody("Payment Required", "No credits", 402)),
    )
      .includes("image-credit limit"),
    true,
  );
  assertEquals(
    formatHctiError(
      403,
      "GET",
      "/v1/usage",
      JSON.stringify(errorBody("Forbidden", "needs usage:read", 403)),
    )
      .includes("permission"),
    true,
  );
  assertEquals(
    formatHctiError(502, "GET", "/v1/usage", "<html>bad gateway</html>"),
    "HTML/CSS to Image 502 for GET /v1/usage: <html>bad gateway</html>",
  );
});

Deno.test("buildBody: coerces numbers, parses JSON strings, keeps booleans, drops empties", () => {
  const body = buildBody(
    {
      device_scale: "2",
      ms_delay: 0,
      metadata: '{"k":"v"}',
      transparent_background: false,
      selector: "",
      timezone: undefined,
    },
    { html: "<b/>" },
  );
  assertEquals(body, {
    html: "<b/>",
    device_scale: 2,
    ms_delay: 0,
    metadata: { k: "v" },
    transparent_background: false,
  });
});

Deno.test("buildBody: viewport and jumbo dimensions must come in pairs, numbers must be numeric", () => {
  assertThrows(() => buildBody({ viewport_width: 800 }), Error, "supplied together");
  assertThrows(() => buildBody({ jumbo_max_width: 800 }, {}, ["jumbo_max_width"]), Error, "jumbo");
  assertThrows(() => buildBody({ device_scale: "big" }), Error, "device_scale must be a number");
  assertEquals(buildBody({ viewport_width: 800, viewport_height: 600 }), {
    viewport_width: 800,
    viewport_height: 600,
  });
});

Deno.test("buildTemplateBody: only TemplateRequest fields survive", () => {
  assertEquals(
    buildTemplateBody({
      template_id: "t-1",
      html: "<p>{{x}}</p>",
      name: "n",
      css: "p{}",
      format: "png",
      dedupe_duration_s: 5,
      device_scale: 2,
    }),
    { html: "<p>{{x}}</p>", name: "n", css: "p{}", device_scale: 2 },
  );
});
