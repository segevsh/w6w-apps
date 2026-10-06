import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  compact,
  errorText,
  FormbricksClient,
  jsonValue,
  objectValue,
  seg,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: skips unset values and encodes the rest", () => {
  assertEquals(buildQuery({ surveyId: "a b", limit: 5 }), "?surveyId=a%20b&limit=5");
  assertEquals(buildQuery({ a: undefined, b: null, c: "" }), "");
  assertEquals(buildQuery({ flag: false }), "?flag=false");
});

Deno.test("seg / strList / jsonValue / objectValue / compact helpers", () => {
  assertEquals(seg("a/b"), "a%2Fb");
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([]), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(objectValue('{"a":1}'), { a: 1 });
  assertEquals(objectValue("[1]"), {});
  assertEquals(objectValue(undefined), {});
  assertEquals(compact({ a: 1, b: undefined, c: null }), { a: 1, c: null });
});

Deno.test("errorText: reads code, message and details; hides HTML", () => {
  assertEquals(
    errorText(
      { code: "bad_request", message: "Fields are missing", details: { key: "Required" } },
      "",
    ),
    'bad_request: Fields are missing {"key":"Required"}',
  );
  assertEquals(errorText({ error: "fileName is required" }, ""), "fileName is required");
  assertEquals(errorText(undefined, "<html>"), "");
  assertEquals(errorText(undefined, "plain text"), "plain text");
});

Deno.test("client: sends JSON bodies with a content-type and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new FormbricksClient(ctx).request("POST", "/webhooks", { body: { url: "u" } });
  assertEquals(calls[0].url, "https://app.formbricks.com/api/v1/webhooks");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"url":"u"}');
  assert(!("x-api-key" in calls[0].headers));
});

Deno.test("client: a 401 names the problem and the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "not_authenticated", message: "Not authenticated", details: {} },
  }]);
  await assertRejects(
    () => new FormbricksClient(ctx).request("GET", "/management/me"),
    Error,
    "HTTP 401 — not_authenticated: Not authenticated",
  );
});

Deno.test("client: an empty success body yields an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await new FormbricksClient(ctx).request("GET", "/x"), {});
});
