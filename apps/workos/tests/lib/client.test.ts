import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, describeError, json, WorkOSClient } from "../../lib/client.ts";

Deno.test("compact: drops unset keys so an update does not clear untouched fields", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv([" x ", ""]), ["x"]);
});

Deno.test("json: passes live values through and rejects malformed text by name", () => {
  assertEquals(json({ a: 1 }, "metadata"), { a: 1 });
  assertEquals(json('{"a":1}', "metadata"), { a: 1 });
  assertEquals(json("", "metadata"), undefined);
  try {
    json("{oops", "metadata");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`metadata`"), String(err));
  }
});

Deno.test("client: builds the URL, drops empty query values and sets no authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new WorkOSClient(ctx).request("/organizations", { query: { order: "desc", blank: "" } });
  assertEquals(calls[0].url, "https://api.workos.com/organizations?order=desc");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** WorkOS takes repeated keys for list parameters, not a joined string. */
Deno.test("client: an array query parameter becomes repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new WorkOSClient(ctx).request("/events", { query: { events: ["a.b", "c.d"] } });
  assertEquals(new URL(calls[0].url).searchParams.getAll("events"), ["a.b", "c.d"]);
});

Deno.test("client: a 204 answers undefined rather than failing to parse", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new WorkOSClient(ctx).request("/organizations/org_1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: an error carries the method, the path and WorkOS's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Organization not found" } }]);
  await assertRejects(
    async () => await new WorkOSClient(ctx).request("/organizations/org_x"),
    Error,
    "WorkOS 404 for GET /organizations/org_x: Organization not found",
  );
});

/** The `errors` array names the field, which is the half worth surfacing. */
Deno.test("describeError: a 422 surfaces the offending field names", () => {
  const text = JSON.stringify({
    code: "validation_error",
    message: "Validation failed",
    errors: [{ field: "domain_data", code: "invalid" }],
  });
  const out = describeError(422, text);
  assert(out.includes("domain_data: invalid"), out);
  assert(out.includes("named the field"), out);
});

/**
 * The environment mistake is the expensive one — a staging key sees an entirely
 * different world rather than failing — so the 401 says so.
 */
Deno.test("describeError: a 401 points at the sk_test / sk_live distinction", () => {
  const out = describeError(401, JSON.stringify({ message: "Unauthorized" }));
  assert(out.includes("sk_test_"), out);
  assert(out.includes("sk_live_"), out);
});

Deno.test("describeError: a non-JSON body still produces something readable", () => {
  assertEquals(describeError(502, "<html>bad gateway</html>"), "<html>bad gateway</html>");
});

/** The cursor is an object id and a null `after` is the end of the list. */
Deno.test("client: requestAll follows the after cursor and stops on a null", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "a" }], list_metadata: { after: "a" } } },
    { status: 200, body: { data: [{ id: "b" }], list_metadata: { after: null } } },
  ]);
  const { items, after } = await new WorkOSClient(ctx).requestAll("/organizations");
  assertEquals(items, [{ id: "a" }, { id: "b" }]);
  assertEquals(after, undefined);
  assertEquals(new URL(calls[0].url).searchParams.get("after"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("after"), "a");
});

Deno.test("client: requestAll never asks for more than WorkOS's page cap of 100", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: Array.from({ length: 100 }, (_, i) => ({ i })), list_metadata: { after: "x" } },
    },
    { status: 200, body: { data: [{ i: 100 }], list_metadata: { after: null } } },
  ]);
  const { items } = await new WorkOSClient(ctx).requestAll("/organizations", {}, 150);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
  assertEquals(new URL(calls[1].url).searchParams.get("limit"), "50");
  assertEquals(items.length, 101);
});

Deno.test("client: requestAll trims to the requested total", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { data: [{ i: 1 }, { i: 2 }, { i: 3 }], list_metadata: { after: null } } },
  ]);
  const { items } = await new WorkOSClient(ctx).requestAll("/organizations", {}, 2);
  assertEquals(items.length, 2);
});
