import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, UptimeRobotClient } from "../../lib/client.ts";

Deno.test("client: builds the request against API_URL as a form-urlencoded POST", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok" } }]);
  const client = new UptimeRobotClient(ctx);
  await client.request("/getMonitors", { search: "example", limit: 10, offset: undefined });
  assertEquals(calls[0].method, "POST");
  assertEquals(API_URL, "https://api.uptimerobot.com/v2");
  assertEquals(calls[0].url, `${API_URL}/getMonitors`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("search"), "example");
  assertEquals(body.get("limit"), "10");
  assertEquals(body.has("offset"), false);
});

Deno.test("client: never sets api_key or format itself — that's the auth sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok" } }]);
  const client = new UptimeRobotClient(ctx);
  await client.request("/getAccountDetails");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.has("api_key"), false);
  assertEquals(body.has("format"), false);
});

Deno.test('client: unwraps stat:"ok" and returns the parsed envelope', async () => {
  const { ctx } = mockCtx([{ body: { stat: "ok", account: { email: "a@b.com" } } }]);
  const client = new UptimeRobotClient(ctx);
  const result = await client.request<{ stat: "ok"; account: { email: string } }>(
    "/getAccountDetails",
  );
  assertEquals(result.account.email, "a@b.com");
});

Deno.test('client: stat:"fail" throws with the vendor\'s own error message', async () => {
  const { ctx } = mockCtx([{
    body: {
      stat: "fail",
      error: { type: "invalid_parameter", parameter_name: "id", message: "monitor not found" },
    },
  }]);
  const client = new UptimeRobotClient(ctx);
  await assertRejects(
    () => client.request("/getMonitors", { monitors: "999" }),
    Error,
    "monitor not found",
  );
});

Deno.test("client: a non-ok HTTP response throws with status and body detail", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error" }]);
  const client = new UptimeRobotClient(ctx);
  await assertRejects(
    () => client.request("/getAccountDetails"),
    Error,
    "UptimeRobot 500",
  );
});
