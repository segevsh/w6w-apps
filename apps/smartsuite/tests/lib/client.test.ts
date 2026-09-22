import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, encodeSegment, SmartSuiteClient } from "../../lib/client.ts";

Deno.test("client: joins paths onto the SmartSuite v1 base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new SmartSuiteClient(ctx).request("solutions/");
  assertEquals(calls[0].url.startsWith(API_URL), true);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/solutions/");
});

Deno.test("client: skips null/undefined/empty query values but keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SmartSuiteClient(ctx).request("applications/t/records/list/", {
    query: { offset: 0, limit: 100, all: false, skipMe: undefined, alsoSkip: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("offset"), "0");
  assertEquals(url.searchParams.get("all"), "false");
  assertEquals(url.searchParams.has("skipMe"), false);
  assertEquals(url.searchParams.has("alsoSkip"), false);
});

Deno.test("client: throws with the plain-text body on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Account ID is not specified" }]);
  let message = "";
  try {
    await new SmartSuiteClient(ctx).request("solutions/");
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400"), true);
  assertEquals(message.includes("Account ID is not specified"), true);
});

Deno.test("client: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new SmartSuiteClient(ctx).request("applications/t/records/r/", {
      method: "DELETE",
    }),
    undefined,
  );
});

Deno.test("encodeSegment: escapes a slash so a path segment cannot break out", () => {
  assertEquals(encodeSegment("a/b c"), "a%2Fb%20c");
});
