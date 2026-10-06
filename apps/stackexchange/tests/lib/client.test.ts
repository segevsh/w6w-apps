import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  commonQuery,
  idList,
  StackExchangeClient,
  tagList,
  toUnix,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("idList: normalises separators and encodes segments", () => {
  assertEquals(idList("1, 2;3\n4"), "1;2;3;4");
  assertEquals(idList(["a b", "c++"]), "a%20b;c%2B%2B");
});

Deno.test("tagList / toUnix / buildQuery", () => {
  assertEquals(tagList("a, b"), "a;b");
  assertEquals(tagList(""), undefined);
  assertEquals(toUnix("2026-01-01T00:00:00Z"), 1767225600);
  assertEquals(toUnix("1700000000"), 1700000000);
  assertEquals(toUnix("garbage"), undefined);
  assertEquals(buildQuery({ a: 1, b: "", c: undefined }), "?a=1");
  assertEquals(buildQuery({}), "");
});

Deno.test("commonQuery: defaults the site, can omit it", () => {
  assertEquals(commonQuery({}).site, "stackoverflow");
  assertEquals(commonQuery({}, false).site, undefined);
});

Deno.test("client: an error object on a 200 still throws, with the backoff", async () => {
  const { ctx } = mockCtx([{
    body: { error_id: 502, error_name: "throttle_violation", error_message: "slow", backoff: 30 },
  }]);
  await assertRejects(() => new StackExchangeClient(ctx).get("/info"), Error, "backoff 30s");
});

Deno.test("client: a non-JSON failure reports the status", async () => {
  const { ctx } = mockCtx([{
    status: 503,
    body: "oops",
    headers: { "content-type": "text/plain" },
  }]);
  await assertRejects(() => new StackExchangeClient(ctx).get("/info"), Error, "HTTP 503");
});
