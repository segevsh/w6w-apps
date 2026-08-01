import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { fullname, listingItems, RedditClient } from "../../lib/client.ts";

Deno.test("fullname: adds the prefix when missing", () => {
  assertEquals(fullname("t3", "abc123"), "t3_abc123");
  assertEquals(fullname("t1", "xyz789"), "t1_xyz789");
});

Deno.test("fullname: leaves an already-prefixed id alone", () => {
  assertEquals(fullname("t3", "t3_abc123"), "t3_abc123");
});

Deno.test("listingItems: unwraps a Listing's children into their data", () => {
  const listing = {
    kind: "Listing" as const,
    data: {
      children: [{ kind: "t3", data: { id: "1" } }, { kind: "t3", data: { id: "2" } }],
      after: "t3_2",
      before: null,
    },
  };
  assertEquals(listingItems(listing), [{ id: "1" }, { id: "2" }]);
});

Deno.test("RedditClient: GET builds the query string and returns the parsed body", async () => {
  const { ctx, calls } = mockCtx([{ body: { kind: "Listing", data: { children: [] } } }]);
  const out = await new RedditClient(ctx).request("/r/test/hot.json", {
    query: { limit: 25, after: undefined },
  });
  assertEquals(calls[0].url, "https://oauth.reddit.com/r/test/hot.json?limit=25");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { kind: "Listing", data: { children: [] } });
});

Deno.test("RedditClient: POST sends a form-urlencoded body, not JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { json: { errors: [], data: { id: "1" } } } }]);
  await new RedditClient(ctx).request("/api/submit", {
    method: "POST",
    form: { api_type: "json", sr: "test", title: "hi", url: undefined },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "api_type=json&sr=test&title=hi");
});

Deno.test("RedditClient: throws with the vendor's message on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden", error: 403 } }]);
  await assertRejects(
    () => new RedditClient(ctx).request("/api/v1/me"),
    Error,
    "Forbidden",
  );
});

Deno.test("RedditClient: throws on a 200 response carrying json.errors", async () => {
  const { ctx } = mockCtx([{
    body: { json: { errors: [["RATELIMIT", "you are doing that too much", "ratelimit"]] } },
  }]);
  await assertRejects(
    () => new RedditClient(ctx).request("/api/submit", { method: "POST", form: {} }),
    Error,
    "you are doing that too much",
  );
});
