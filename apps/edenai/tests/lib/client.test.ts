import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  compact,
  EdenClient,
  errorDetail,
  formatEdenError,
  list,
  parseJson,
  truncate,
} from "../../lib/client.ts";
import { detail, mockCtx, queryOf } from "../_helpers.ts";
import { buildBody, modelString, runUniversal } from "../../lib/universal.ts";

Deno.test("client: API_BASE is the OpenAPI document's one declared server", () => {
  assertEquals(API_BASE, "https://api.edenai.run");
});

Deno.test("compact: drops undefined, null, empty string and empty arrays; keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x", g: [] }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("list: splits on commas and newlines and trims", () => {
  assertEquals(list("a, b\n c ,,"), ["a", "b", "c"]);
  assertEquals(list(["x ", ""]), ["x"]);
  assertEquals(list(undefined), []);
});

Deno.test("parseJson: passes objects through, parses strings, names the field on failure", () => {
  assertEquals(parseJson({ a: 1 }, "X"), { a: 1 });
  assertEquals(parseJson('{"a":1}', "X"), { a: 1 });
  assertEquals(parseJson("", "X"), undefined);
  try {
    parseJson("{nope", "Extra body");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("Extra body is not valid JSON"));
  }
});

Deno.test("truncate: shortens only long text", () => {
  assertEquals(truncate("abc", 10), "abc");
  assert(truncate("x".repeat(50), 10).includes("truncated"));
});

Deno.test("errorDetail: reads the string detail, the validation array and error objects", () => {
  assertEquals(errorDetail('{"detail":"Invalid token"}'), "Invalid token");
  assertEquals(
    errorDetail('{"detail":[{"loc":["body","model"],"msg":"Field required","type":"missing"}]}'),
    "model: Field required",
  );
  assertEquals(errorDetail('{"error":{"message":"boom"}}'), "boom");
  assertEquals(errorDetail('{"message":"m"}'), "m");
  assertEquals(errorDetail("not json"), undefined);
});

Deno.test("formatEdenError: includes status, route and the vendor message", () => {
  const msg = formatEdenError(401, "GET", "/v3/x", '{"detail":"Invalid token"}');
  assert(msg.includes("401") && msg.includes("/v3/x") && msg.includes("Invalid token"), msg);
  assert(formatEdenError(500, "GET", "/v3/x", "upstream exploded").includes("upstream exploded"));
});

Deno.test("EdenClient.json: builds the URL under /v3 with a query and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await new EdenClient(ctx).json("/things", { query: { a: 1, b: undefined, c: "" } });

  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://api.edenai.run/v3/things?a=1");
  assertEquals(queryOf(calls[0].url), { a: "1" });
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("EdenClient.json: POST sends a JSON body with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EdenClient(ctx).json("/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("EdenClient.json: a non-2xx throws the vendor's detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { detail: [{ loc: ["body", "x"], msg: "bad" }] },
  }]);
  await assertRejects(() => new EdenClient(ctx).json("/x"), Error, "x: bad");
});

Deno.test("EdenClient.json: a non-JSON success body is an error, not a crash", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  await assertRejects(() => new EdenClient(ctx).json("/x"), Error, "not JSON");
});

Deno.test("EdenClient.json: an empty body yields {}", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new EdenClient(ctx).json("/x", { method: "DELETE" }), {});
});

Deno.test("modelString: feature/subfeature/provider[/model]", () => {
  assertEquals(modelString("text", "moderation", "openai"), "text/moderation/openai");
  assertEquals(
    modelString("translation", "automatic_translation", "openai/gpt-4o"),
    "translation/automatic_translation/openai/gpt-4o",
  );
  try {
    modelString("a", "b", " ");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("provider is required"));
  }
});

Deno.test("buildBody: nests input, splits fallbacks, caps them at 3", () => {
  const body = buildBody({
    feature: "ocr",
    subfeature: "ocr",
    provider: "google",
    input: { file: "u" },
    fallbacks: "amazon, microsoft",
    providerParams: '{"k":1}',
  });
  assertEquals(body, {
    model: "ocr/ocr/google",
    input: { file: "u" },
    fallbacks: ["amazon", "microsoft"],
    provider_params: { k: 1 },
  });
  try {
    buildBody({ feature: "a", subfeature: "b", provider: "c", input: {}, fallbacks: "1,2,3,4" });
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("at most 3"));
  }
});

Deno.test("runUniversal: a 200 with status fail is a thrown error", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "google", error: { message: "quota exceeded" } },
  }]);
  await assertRejects(
    () => runUniversal(ctx, { feature: "ocr", subfeature: "ocr", provider: "google", input: {} }),
    Error,
    "quota exceeded",
  );
});

Deno.test("detail helper builds the vendor's error body", () => {
  assertEquals(detail("x"), { detail: "x" });
});
