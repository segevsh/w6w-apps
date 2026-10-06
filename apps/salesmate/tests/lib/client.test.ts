import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockSalesmateCtx } from "../_helpers.ts";
import {
  assertLinkname,
  baseUrl,
  compact,
  customFields,
  errorMessage,
  linknameFromConnection,
  parseJson,
  SalesmateClient,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's link name and unwraps Data", async () => {
  const { ctx, calls } = mockSalesmateCtx([{ body: { Status: "success", Data: { id: 7 } } }]);
  const out = await new SalesmateClient(ctx).request("/contact/v4/7");
  assertEquals(out, { id: 7 });
  assertEquals(calls[0].url, "https://acme.salesmate.io/apis/contact/v4/7");
  assertEquals(calls[0].headers["x-linkname"], "acme.salesmate.io");
  assertEquals("accesstoken" in calls[0].headers, false);
});

Deno.test("client: sends a JSON body and drops empty query values", async () => {
  const { ctx, calls } = mockSalesmateCtx([{ body: { Status: "success", Data: {} } }]);
  await new SalesmateClient(ctx).request("/contact/v4/search", {
    method: "POST",
    query: { rows: 10, from: 0, viewType: undefined, x: "" },
    body: { a: 1 },
  });
  assertEquals(calls[0].url, "https://acme.salesmate.io/apis/contact/v4/search?rows=10&from=0");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: fails loudly when the connection carries no link name", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new SalesmateClient(ctx), Error, "no link name");
});

Deno.test("client: surfaces the vendor's failure body even on HTTP 200", async () => {
  const { ctx } = mockSalesmateCtx([{
    body: {
      Status: "failure",
      Error: { Code: "4005", Name: "ObjectNotFound", Message: "Object not found" },
    },
  }]);
  await assertRejects(
    () => new SalesmateClient(ctx).request("/contact/v4/1", { method: "DELETE" }),
    Error,
    "Object not found",
  );
});

Deno.test("client: reads the lowercase error keys the live API actually returns", async () => {
  const { ctx } = mockSalesmateCtx([{
    status: 403,
    body: { Status: "failure", Error: { message: "", name: "AuthorizationFailed" } },
  }]);
  await assertRejects(
    () => new SalesmateClient(ctx).request("/core/v4/users"),
    Error,
    "AuthorizationFailed",
  );
});

Deno.test("linkname: only a single DNS label is accepted", () => {
  assertEquals(assertLinkname("acme-1"), "acme-1");
  for (
    const bad of [
      "",
      "acme.salesmate.io",
      "evil.com/x",
      "a@evil.com",
      "acme:8080",
      "acme#",
      "-acme",
      "acme-",
      "a b",
      undefined,
    ]
  ) {
    assertThrows(() => assertLinkname(bad), Error, "Invalid Salesmate link name");
  }
});

Deno.test("linkname: baseUrl and the connection reader both refuse a hostile value", () => {
  assertEquals(baseUrl("acme"), "https://acme.salesmate.io/apis");
  assertThrows(() => baseUrl("evil.com/#"), Error);
  assertThrows(
    () => linknameFromConnection({ display: { linkname: "evil.com/#" } } as never),
    Error,
    "Invalid Salesmate link name",
  );
});

Deno.test("helpers: compact keeps false and 0 but drops unset and blank", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("helpers: parseJson / customFields accept objects or JSON strings and reject junk", () => {
  assertEquals(parseJson('{"a":1}', "x"), { a: 1 });
  assertEquals(parseJson(undefined, "x"), undefined);
  assertThrows(() => parseJson("{nope", "x"), Error, "valid JSON");
  assertEquals(customFields('{"textCustomField1":"v"}'), { textCustomField1: "v" });
  assertEquals(customFields(undefined), {});
  assertThrows(() => customFields("[1]"), Error, "JSON object");
});

Deno.test("helpers: errorMessage prefers Message, then message, then Name", () => {
  assertEquals(errorMessage({ Error: { Message: "m", name: "n" } }, "f"), "m");
  assertEquals(errorMessage({ Error: { name: "n" } }, "f"), "n");
  assertEquals(errorMessage(undefined, "f"), "f");
});
