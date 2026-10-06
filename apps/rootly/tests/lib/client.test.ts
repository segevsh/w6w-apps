import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  compact,
  errorText,
  flatten,
  intList,
  itemResult,
  jsonApiBody,
  jsonValue,
  listResult,
  RootlyClient,
  seg,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: buildQuery encodes bracketed keys, repeats arrays and skips empties", () => {
  const q = buildQuery({
    "filter[status]": "started",
    "user_ids[]": [1, 2],
    include: "",
    "page[size]": 0,
    skip: undefined,
    none: null,
    flag: false,
  });
  assertEquals(
    decodeURIComponent(q),
    "?filter[status]=started&user_ids[]=1&user_ids[]=2&page[size]=0&flag=false",
  );
  assertEquals(buildQuery({}), "");
});

Deno.test("client: list coercions accept arrays and comma text", () => {
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([]), undefined);
  assertEquals(intList("1, 2"), [1, 2]);
  assertEquals(intList(["x"]), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue(" "), undefined);
  assertEquals(compact({ a: 1, b: "", c: null, d: false }), { a: 1, d: false });
  assertEquals(seg(" a/b "), "a%2Fb");
});

Deno.test("client: flatten, listResult, itemResult and jsonApiBody shape JSON:API", () => {
  assertEquals(flatten({ id: "1", type: "t", attributes: { a: 1, id: "wrong" } }), {
    a: 1,
    id: "1",
    type: "t",
  });
  assertEquals(flatten(null), null);
  assertEquals(listResult({}), { items: [], included: [], meta: null, links: null });
  assertEquals(itemResult({ data: null }), { item: null, included: [] });
  assertEquals(jsonApiBody("groups", { name: "x" }, "9"), {
    data: { type: "groups", id: "9", attributes: { name: "x" } },
  });
  assertEquals(jsonApiBody("groups", {}), { data: { type: "groups", attributes: {} } });
});

Deno.test("client: errorText joins title and detail, ignores HTML", () => {
  assertEquals(
    errorText({ errors: [{ title: "Bad", detail: "why" }, { title: "Worse" }] }, ""),
    "Bad: why; Worse",
  );
  assertEquals(errorText(undefined, "<html>x</html>"), "");
  assertEquals(errorText(undefined, " plain "), "plain");
});

Deno.test("client: request sends the JSON:API media type and adds a hint to failures", async () => {
  const { ctx, calls } = mockCtx([{ status: 429, body: { errors: [{ title: "Too many" }] } }, {
    status: 200,
    body: "",
  }]);
  const err = await assertRejects(() => new RootlyClient(ctx).request("GET", "/v1/x"), Error);
  assert(err.message.includes("HTTP 429 — Too many"));
  assert(err.message.includes("3,000 requests per 60 seconds"));
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(await new RootlyClient(ctx).request("DELETE", "/v1/x"), {});
});
