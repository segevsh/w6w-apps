import { assertEquals, assertRejects } from "@std/assert";
import { buildQuery, DubClient, errorText, jsonValue, seg, strList } from "../../lib/client.ts";
import { linkBody } from "../../lib/links.ts";
import { filterQuery } from "../../lib/filters.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("strList: arrays and comma text normalise; empty is undefined", () => {
  assertEquals(strList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(strList([" a ", "b"]), ["a", "b"]);
  assertEquals(strList(""), undefined);
  assertEquals(strList(undefined), undefined);
  assertEquals(strList([]), undefined);
});

Deno.test("jsonValue: parses JSON text, passes objects and bad text through", () => {
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue({ a: 1 }), { a: 1 });
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonValue("{oops"), "{oops");
});

Deno.test("buildQuery: skips unset and empty values and comma-joins arrays", () => {
  assertEquals(buildQuery(undefined), "");
  assertEquals(
    buildQuery({ a: "1", b: undefined, c: null, d: "", e: false, f: ["x", "y"], g: [] }),
    "?a=1&e=false&f=x%2Cy",
  );
});

Deno.test("seg: encodes slashes and spaces", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
});

Deno.test("errorText: formats Dub's envelope, falls back to the raw body", () => {
  assertEquals(
    errorText({ error: { code: "not_found", message: "Link not found." } }),
    "Link not found. (not_found)",
  );
  assertEquals(errorText(null, "  <html>x</html> "), "<html>x</html>");
});

Deno.test("DubClient: a non-JSON failure carries the status and a body excerpt", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway", headers: {} }]);
  await assertRejects(
    () => new DubClient(ctx).request("GET", "/links"),
    Error,
    "HTTP 502 — bad gateway",
  );
});

Deno.test("DubClient: content-type is sent only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new DubClient(ctx);
  await client.request("GET", "/links");
  await client.request("POST", "/links", { body: { url: "https://a.com" } });
  assertEquals("content-type" in calls[0].headers, false);
  assertEquals(calls[1].headers["content-type"], "application/json");
});

Deno.test("linkBody: drops unset fields, keeps null (a clear), splits lists, parses geo", () => {
  assertEquals(
    linkBody({
      url: "https://a.com",
      externalId: null,
      tagIds: "a,b",
      tagNames: "",
      geo: '{"US":"https://a.com/us"}',
      archived: false,
    }),
    {
      url: "https://a.com",
      externalId: null,
      tagIds: ["a", "b"],
      geo: { US: "https://a.com/us" },
      archived: false,
    },
  );
});

Deno.test("filterQuery: forwards only declared filters", () => {
  assertEquals(filterQuery({ domain: "dub.sh", interval: "7d", bogus: "x", page: 2 }), {
    domain: "dub.sh",
    interval: "7d",
  });
});
