import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  asJsonValue,
  AudiencesClient,
  normalizeAdAccountId,
  normalizeNodeId,
} from "../../lib/client.ts";

Deno.test("client: normalizeAdAccountId accepts bare and act_ forms, refuses anything else", () => {
  assertEquals(normalizeAdAccountId("123"), "act_123");
  assertEquals(normalizeAdAccountId(" act_123 "), "act_123");
  assertThrows(() => normalizeAdAccountId("123/users"));
  assertThrows(() => normalizeAdAccountId(""));
  assertThrows(() => normalizeNodeId("12a", "Audience"), Error, "numeric");
});

Deno.test("client: writes go as a urlencoded form with objects JSON-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new AudiencesClient(ctx).request("/act_1/customaudiences", {
    method: "POST",
    form: { name: "A B", spec: { country: "US" }, skip: undefined, flag: false },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("name"), "A B");
  assertEquals(body.get("spec"), '{"country":"US"}');
  assertEquals(body.get("flag"), "false");
  assertEquals(body.has("skip"), false);
});

Deno.test("client: never sends an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new AudiencesClient(ctx).request("/me");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: surfaces Meta's error message and code, never the request body", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "Invalid parameter", code: 100, error_subcode: 1713230 } },
  }]);
  const err = await assertRejects(
    () =>
      new AudiencesClient(ctx).request("/1/users", {
        method: "POST",
        form: { payload: { data: [["f1904cf1a9d73a55"]] } },
      }),
    Error,
    "Invalid parameter (code 100/1713230)",
  );
  assertEquals(err.message.includes("f1904cf1a9d73a55"), false);
});

Deno.test("client: an error envelope on a 200 is still an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: { message: "nope", code: 200 } } }]);
  await assertRejects(() => new AudiencesClient(ctx).request("/me"), Error, "nope");
});

Deno.test("client: asJsonValue parses text, passes objects", () => {
  assertEquals(asJsonValue("[1]", "x"), [1]);
  assertEquals(asJsonValue({ a: 1 }, "x"), { a: 1 });
  assertThrows(() => asJsonValue("{", "Users"), Error, "Users is not valid JSON");
});
