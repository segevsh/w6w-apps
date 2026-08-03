import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  CloseClient,
  compact,
  PAGE_PARAMS,
  pageQuery,
  withCustomFields,
} from "../../lib/client.ts";

Deno.test("client: targets the current api.close.com host, not the legacy close.io one", () => {
  assertEquals(API_URL, "https://api.close.com/api/v1");
  assert(!API_URL.includes("close.io"));
});

Deno.test("client: GETs with an accept header and no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await new CloseClient(ctx).request("/lead/");
  assertEquals(calls[0].url, "https://api.close.com/api/v1/lead/");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new CloseClient(ctx).request("/lead/", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: preserves the trailing slash Close's router requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new CloseClient(ctx).request("/lead/lead_1/");
  assert(calls[0].url.endsWith("/lead/lead_1/"), calls[0].url);
});

Deno.test("client: serialises a JSON body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "lead_1" } }]);
  await new CloseClient(ctx).request("/lead/", { method: "POST", body: { name: "Bluth" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Bluth" });
});

Deno.test("client: appends query params, skipping undefined, null and empty string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new CloseClient(ctx).request("/lead/", {
    query: { _limit: 10, _skip: 0, _fields: undefined, lead_id: null, q: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("_limit"), "10");
  // 0 is meaningful and must survive; only undefined/null/"" are dropped.
  assertEquals(url.searchParams.get("_skip"), "0");
  assertEquals(url.searchParams.has("_fields"), false);
  assertEquals(url.searchParams.has("lead_id"), false);
  assertEquals(url.searchParams.has("q"), false);
});

Deno.test("client: throws with status, method, path and body on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "bad status_id" } }]);
  const err = await assertRejects(
    () => new CloseClient(ctx).request("/lead/", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("Close 400"));
  assert(err.message.includes("POST"));
  assert(err.message.includes("/api/v1/lead/"));
  assert(err.message.includes("bad status_id"));
});

Deno.test("client: returns undefined for a 204 and for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new CloseClient(ctx);
  assertEquals(await client.request("/lead/lead_1/", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/lead/"), undefined);
});

Deno.test("pageQuery: maps the shared page inputs onto Close's underscore names", () => {
  assertEquals(pageQuery({ skip: 100, limit: 50, fields: "id,name" }), {
    _skip: 100,
    _limit: 50,
    _fields: "id,name",
  });
  assertEquals(pageQuery({}), { _skip: undefined, _limit: undefined, _fields: undefined });
});

Deno.test("PAGE_PARAMS: exposes limit, skip and fields, and warns about deep pagination", () => {
  assertEquals(PAGE_PARAMS.map((p) => p.key), ["limit", "skip", "fields"]);
  const skip = PAGE_PARAMS.find((p) => p.key === "skip")!;
  assert(/date_created/.test(skip.hint!), "the deep-pagination workaround should be stated");
});

Deno.test("compact: drops undefined but keeps null, false and 0", () => {
  // The distinction is load-bearing: Close's PUT is a patch, so an omitted field
  // must vanish while an explicit null must survive to clear the value.
  assertEquals(compact({ a: undefined, b: null, c: false, d: 0, e: "" }), {
    b: null,
    c: false,
    d: 0,
    e: "",
  });
});

Deno.test("withCustomFields: flattens onto top-level `custom.<id>` keys", () => {
  assertEquals(
    withCustomFields({ name: "Bluth" }, { cf_abc: "Segway" }),
    { name: "Bluth", "custom.cf_abc": "Segway" },
  );
});

Deno.test("withCustomFields: accepts an already-prefixed key without double-prefixing", () => {
  assertEquals(
    withCustomFields({}, { "custom.cf_abc": "x" }),
    { "custom.cf_abc": "x" },
  );
});

Deno.test("withCustomFields: is a no-op for undefined or null, and does not mutate its input", () => {
  const body = { name: "Bluth" };
  assertEquals(withCustomFields(body, undefined), { name: "Bluth" });
  assertEquals(withCustomFields(body, null), { name: "Bluth" });
  const out = withCustomFields(body, { cf_a: 1 });
  assertEquals(body, { name: "Bluth" }, "input body must not be mutated");
  assertEquals(out["custom.cf_a"], 1);
});

Deno.test("withCustomFields: never nests a deprecated `custom` object", () => {
  const out = withCustomFields({}, { cf_a: 1 });
  // Close is removing the nested `custom` dict form; only flat keys are correct.
  assertEquals((out as Record<string, unknown>).custom, undefined);
});
