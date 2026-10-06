import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  ActionNetworkClient,
  buildQuery,
  compact,
  errorText,
  jsonValue,
  need,
  redact,
  resourceId,
  seg,
  simplify,
  simplifyPage,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("seg: strips the action_network prefix and encodes", () => {
  assertEquals(seg("action_network:abc-1"), "abc-1");
  assertEquals(seg(" a/b "), "a%2Fb");
});

Deno.test("need: rejects blank values", () => {
  assertEquals(need({ a: 5 }, "a"), "5");
  for (const v of [undefined, null, "", "  "]) {
    let threw = false;
    try {
      need({ a: v }, "a");
    } catch {
      threw = true;
    }
    assert(threw);
  }
});

Deno.test("strList / jsonValue / compact / buildQuery", () => {
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([]), undefined);
  assertEquals(strList(undefined), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("{bad"), "{bad");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(compact({ a: 1, b: "", c: undefined, d: 0 }), { a: 1, d: 0 });
  assertEquals(buildQuery({ a: 1, b: "", c: null, d: "x y" }), "?a=1&d=x+y");
  assertEquals(buildQuery({}), "");
});

Deno.test("redact: cuts the echoed key; errorText handles strings, objects and raw text", () => {
  assertEquals(redact("API Key invalid or not present sk_1"), "API Key invalid or not present");
  assertEquals(
    errorText({ error: "API Key invalid or not present sk_1" }),
    "API Key invalid or not present",
  );
  assertEquals(errorText({ error: { a: 1 } }), '{"a":1}');
  assertEquals(errorText(null, " plain "), "plain");
});

Deno.test("simplify / resourceId / simplifyPage flatten HAL", () => {
  assertEquals(resourceId({ identifiers: ["x:1", "action_network:u1"] }), "u1");
  assertEquals(resourceId({}), undefined);
  assertEquals(simplify({ identifiers: ["action_network:u1"], n: 1, _links: {}, _embedded: {} }), {
    id: "u1",
    identifiers: ["action_network:u1"],
    n: 1,
  });
  assertEquals(simplify("x"), "x");
  const page = simplifyPage({
    page: 2,
    per_page: 25,
    total_pages: 3,
    total_records: 60,
    _links: { next: { href: "n" } },
    _embedded: { "osdi:petitions": [{ identifiers: ["action_network:p1"], _links: {} }] },
  });
  assertEquals(page, {
    items: [{ id: "p1", identifiers: ["action_network:p1"] }],
    page: 2,
    perPage: 25,
    totalPages: 3,
    totalRecords: 60,
    hasMore: true,
  });
  assertEquals(simplifyPage(null), { items: [], hasMore: false });
});

Deno.test("client: a non-JSON failure body is reported by status and text", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  await assertRejects(
    () => new ActionNetworkClient(ctx).get("/people"),
    Error,
    "HTTP 502 — bad gateway",
  );
});

Deno.test("client: an empty success body resolves to an empty object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  assertEquals(await new ActionNetworkClient(ctx).create("/people", { a: 1 }, true), {});
  assert(calls[0].url.endsWith("/people?background_request=true"));
  assertEquals(calls[0].headers["content-type"], "application/json");
});
