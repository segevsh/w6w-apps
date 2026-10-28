import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  apiHostFromConnection,
  errorDetail,
  flattenBulkRecords,
  identifier,
  jsonObject,
  unwrap,
  ZohoPeopleClient,
} from "../../lib/client.ts";
import { mockPeopleCtx } from "../_helpers.ts";

Deno.test("client: resolves the API host from the connection, defaulting to US", () => {
  assertEquals(apiHostFromConnection(undefined), "people.zoho.com");
  const { ctx } = mockPeopleCtx([], "people.zoho.eu");
  assertEquals(apiHostFromConnection(ctx.connection), "people.zoho.eu");
});

Deno.test("client: requests go to the connection's regional host", async () => {
  const { ctx, calls } = mockPeopleCtx(
    [{ body: { response: { result: [], status: 0 } } }],
    "people.zoho.in",
  );
  await new ZohoPeopleClient(ctx).request("/people/api/forms");
  assertEquals(new URL(calls[0].url).host, "people.zoho.in");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: form bodies are urlencoded and empty values are dropped", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: {} }]);
  await new ZohoPeopleClient(ctx).request("/x", {
    method: "POST",
    form: { a: "1", b: "", c: undefined },
  });
  assertEquals(calls[0].body, "a=1");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("client: response.status 1 inside a 2xx is thrown as an error", async () => {
  const { ctx } = mockPeopleCtx([{
    body: { response: { errors: { code: 7052, message: "Invalid value" }, status: 1 } },
  }]);
  const err = await assertRejects(() => new ZohoPeopleClient(ctx).request("/people/api/x"), Error);
  assert(/7052/.test(err.message) && /Invalid value/.test(err.message), err.message);
});

Deno.test("errorDetail: understands object errors, array errors and the v2 `error` shape", () => {
  assertEquals(errorDetail('{"response":{"errors":{"code":7011,"message":"bad form"}}}'), {
    code: "7011",
    message: "bad form",
  });
  assertEquals(errorDetail('{"response":{"errors":[{"code":9007,"message":"one month"}]}}'), {
    code: "9007",
    message: "one month",
  });
  assertEquals(errorDetail('{"error":{"code":7213,"message":"invalid"}}'), {
    code: "7213",
    message: "invalid",
  });
  assertEquals(errorDetail("not json"), null);
});

Deno.test("unwrap: handles wrapped, bare-array and v2 shapes", () => {
  assertEquals(unwrap({ response: { result: [1], message: "ok", status: 0 } }), {
    result: [1],
    message: "ok",
  });
  assertEquals(unwrap([{ a: 1 }]), { result: [{ a: 1 }] });
  assertEquals(
    unwrap({ message: "Leave Cancelled", status: "success" }).message,
    "Leave Cancelled",
  );
});

Deno.test("flattenBulkRecords: injects the record id key as recordId", () => {
  const out = flattenBulkRecords([{ "759": [{ FirstName: "John" }] }, {
    "760": [{ FirstName: "Jane" }],
  }]);
  assertEquals(out, [{ recordId: "759", FirstName: "John" }, {
    recordId: "760",
    FirstName: "Jane",
  }]);
  assertEquals(flattenBulkRecords(null), []);
});

Deno.test("identifier/jsonObject: reject unsafe or malformed input", () => {
  assertEquals(identifier("employee"), "employee");
  for (const bad of ["", "a/b", "../x", "x?y=1"]) {
    assertEquals(
      (() => {
        try {
          identifier(bad);
          return "ok";
        } catch {
          return "threw";
        }
      })(),
      "threw",
      bad,
    );
  }
  assertEquals(jsonObject('{"a":1}', "f"), { a: 1 });
  assertEquals(
    (() => {
      try {
        jsonObject("[1]", "f");
        return "ok";
      } catch {
        return "threw";
      }
    })(),
    "threw",
  );
});
