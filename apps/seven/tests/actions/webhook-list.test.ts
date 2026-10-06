import { assert, assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {} as Parameters<typeof webhookList.execute>[0];

Deno.test("webhook-list: GET /api/hooks with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "code": null,
      "hooks": [{
        "id": "1277",
        "headers": "Authorization: Basic dXNlcjpwYXNz",
        "event_type": "all",
      }, { "id": "410", "headers": "" }],
    },
  }]);
  const out = await webhookList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/hooks");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.hooks, [{ id: "1277", event_type: "all", has_headers: true }, {
    id: "410",
    has_headers: false,
  }]);
});

Deno.test("webhook-list: declares type read-or-search and every required param", () => {
  const required = (webhookList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(webhookList.type));
  assertEquals(webhookList.type === "perform", false);
});

Deno.test("webhook-list: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await webhookList.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
