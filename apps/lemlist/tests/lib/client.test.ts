import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_URL,
  compact,
  LemlistClient,
  pageQuery,
  sortQuery,
  withCustomVariables,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: base URL is lemlist's documented api.lemlist.com/api, with no version prefix", () => {
  assertEquals(API_URL, "https://api.lemlist.com/api");
  assert(!API_URL.endsWith("/"));
  assert(!/\/v[12]$/.test(API_URL), "versioning is per-route, not baked into the base");
});

Deno.test("client: prefixes relative paths and leaves absolute URLs alone", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  const client = new LemlistClient(ctx);
  await client.request("/campaigns");
  await client.request("https://api.lemlist.com/api/team");
  assertEquals(calls[0].url, "https://api.lemlist.com/api/campaigns");
  assertEquals(calls[1].url, "https://api.lemlist.com/api/team");
});

Deno.test("client: drops undefined, null and empty-string query values", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new LemlistClient(ctx).request("/campaigns", {
    query: { a: undefined, b: null, c: "", d: 0, e: false, f: "x" },
  });
  const p = new URL(calls[0].url).searchParams;
  assertEquals([...p.keys()].sort(), ["d", "e", "f"]);
  // 0 and false are meaningful values, not absences.
  assertEquals(p.get("d"), "0");
  assertEquals(p.get("e"), "false");
});

Deno.test("client: sets a JSON content-type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new LemlistClient(ctx);
  await client.request("/team");
  await client.request("/campaigns/cam_1/leads/", { method: "POST", body: { email: "a@b.com" } });

  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"email":"a@b.com"}');
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new LemlistClient(ctx).request("/campaigns");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: throws with lemlist's status, path and body on a failure", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: "Campaign not found" }]);
  const err = await assertRejects(() => new LemlistClient(ctx).request("/campaigns/cam_nope"));
  const message = (err as Error).message;
  assert(message.includes("404"));
  assert(message.includes("/api/campaigns/cam_nope"));
  assert(message.includes("Campaign not found"));
});

Deno.test("client: returns undefined for 204 and for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new LemlistClient(ctx);
  assertEquals(await client.request("/x"), undefined);
  assertEquals(await client.request("/y"), undefined);
});

Deno.test("client: falls back to raw text when the body is not JSON", async () => {
  // `DELETE /v2/unsubscribes/variables/{value}` answers with the bare string
  // "Variable subscribed", which JSON.parse cannot read.
  const { ctx } = mockCtx([{ status: 200, body: "Variable subscribed" }]);
  assertEquals(await new LemlistClient(ctx).request("/x"), "Variable subscribed");
});

Deno.test("pageQuery: passes offset/limit through under lemlist's own names", () => {
  assertEquals(pageQuery({ offset: 100, limit: 50 }), { offset: 100, limit: 50 });
  assertEquals(pageQuery({}), { offset: undefined, limit: undefined });
});

Deno.test("sortQuery: passes page/sortBy/sortOrder through", () => {
  assertEquals(sortQuery({ page: 2, sortBy: "createdAt", sortOrder: "desc" }), {
    page: 2,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
});

Deno.test("compact: drops undefined but keeps null, 0, false and empty string", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: 0, d: false, e: "", f: "x" }),
    { b: null, c: 0, d: false, e: "", f: "x" },
  );
});

Deno.test("withCustomVariables: flattens custom keys onto the body, not under a wrapper", () => {
  // lemlist stores any extra TOP-LEVEL key as a lead variable.
  assertEquals(
    withCustomVariables({ email: "a@b.com" }, { companySize: "50-100", customVariable1: "x" }),
    { email: "a@b.com", companySize: "50-100", customVariable1: "x" },
  );
});

Deno.test("withCustomVariables: returns the body untouched when there are none", () => {
  const body = { email: "a@b.com" };
  assertEquals(withCustomVariables(body, undefined), body);
  assertEquals(withCustomVariables(body, null), body);
});

Deno.test("withCustomVariables: does not sanitise names — lemlist does that server-side", () => {
  // Silently rewriting `my.var` to `my_var` would hide which variable the caller
  // actually got, so the key is passed through verbatim.
  assertEquals(
    withCustomVariables({}, { "my.var": "x" }),
    { "my.var": "x" },
  );
});
