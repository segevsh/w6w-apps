import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_HOST,
  API_URL,
  CircleClient,
  compact,
  errorMessage,
  idList,
  jsonObject,
  unset,
} from "../../lib/client.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("client: the base URL is the documented Admin API v2 root", () => {
  assertEquals(API_HOST, "app.circle.so");
  assertEquals(API_URL, "https://app.circle.so/api/admin/v2");
});

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

Deno.test("unset: a blank field is absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("idList: parses, trims and drops non-numbers", () => {
  assertEquals(idList(" 1, 2 ,3 "), [1, 2, 3]);
  assertEquals(idList("1,,2"), [1, 2]);
});

Deno.test("idList: a field with no usable number is undefined, NOT an empty array", () => {
  // An empty array is a VALUE on a PUT — it would clear the association. A user
  // who typed a stray comma did not ask for that.
  assertEquals(idList(""), undefined);
  assertEquals(idList("  "), undefined);
  assertEquals(idList(",,"), undefined);
  assertEquals(idList("abc"), undefined);
  assertEquals(idList(undefined), undefined);
});

Deno.test("jsonObject: accepts an object, a JSON string, and nothing", () => {
  assertEquals(jsonObject({ a: 1 }, "F"), { a: 1 });
  assertEquals(jsonObject('{"a":1}', "F"), { a: 1 });
  assertEquals(jsonObject(undefined, "F"), undefined);
  assertEquals(jsonObject("", "F"), undefined);
});

Deno.test("jsonObject: rejects invalid JSON and non-objects, naming the field", () => {
  assertThrows(() => jsonObject("{oops", "Profile fields"), Error, "Profile fields");
  assertThrows(() => jsonObject("[1,2]", "Profile fields"), Error, "must be a JSON object");
});

Deno.test("errorMessage: pulls Circle's `message` out of its error envelope", () => {
  assertEquals(
    errorMessage('{"success":false,"message":"The API token is invalid.","error_details":{}}'),
    "The API token is invalid.",
  );
});

Deno.test("errorMessage: falls back to raw text for a non-JSON body", () => {
  assertEquals(errorMessage("<html>nope</html>"), "<html>nope</html>");
  assertEquals(errorMessage(""), "");
});

Deno.test("client: GET builds the v2 URL and asks for JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const out = await new CircleClient(ctx).request("/community");
  assertEquals(calls[0].url, `${API_URL}/community`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(out, { id: 1 });
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CircleClient(ctx).request("/community");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: array query values are repeated as `k[]`, which is what Rails parses", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CircleClient(ctx).request("/community_members", {
    query: { member_tag_ids: [1, 2, 3], page: 2 },
  });
  assertEquals(queryOf(calls[0])["member_tag_ids[]"], ["1", "2", "3"]);
  assertEquals(queryOf(calls[0]).page, ["2"]);
});

Deno.test("client: unset query values are omitted, and `false` survives", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CircleClient(ctx).request("/member_tags", {
    query: { a: undefined, b: null, c: "", is_public: false },
  });
  const q = queryOf(calls[0]);
  assertEquals(Object.keys(q), ["is_public"]);
  assertEquals(q.is_public, ["false"]);
});

Deno.test("client: a body is JSON-encoded and content-type is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CircleClient(ctx).request("/posts", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"x"}');
});

Deno.test("client: a DELETE may carry a body — `event_attendees` needs one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CircleClient(ctx).request("/event_attendees", {
    method: "DELETE",
    body: { event_id: 7 },
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, '{"event_id":7}');
});

Deno.test("client: a non-2xx raises with Circle's own message, not the raw envelope", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      statusText: "Forbidden",
      body: { success: false, message: "The community is not eligible for admin API v2 access." },
    },
  ]);
  const err = await assertRejects(
    () => new CircleClient(ctx).request("/community"),
    Error,
  );
  assert(err.message.includes("403"));
  assert(err.message.includes("not eligible for admin API v2"));
  assert(err.message.includes("/api/admin/v2/community"));
});

Deno.test("client: 204 and an empty body resolve to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new CircleClient(ctx);
  assertEquals(await client.request("/posts/1"), undefined);
  assertEquals(await client.request("/posts/2"), undefined);
});
