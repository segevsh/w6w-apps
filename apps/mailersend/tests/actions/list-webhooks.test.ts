import { assertEquals } from "@std/assert";
import action from "../../actions/list-webhooks.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-webhooks: GETs /v1/webhooks with the required domain_id", async () => {
  const body = page([{ id: "w1", name: "hook", events: ["activity.sent"] }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { domainId: "d1", limit: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(queryOf(calls[0].url), { domain_id: "d1", limit: "10" });
  assertEquals(out, body);
});

Deno.test("list-webhooks: strips signing secrets at any depth", async () => {
  const { ctx } = mockCtx([{
    body: page([{ id: "w1", signing_secret: "s3cret", nested: { webhookSecret: "x", keep: 1 } }]),
  }]);
  const out = await exec(action, { domainId: "d1" }, ctx) as { data: Record<string, unknown>[] };
  assertEquals(out.data[0], { id: "w1", nested: { keep: 1 } });
  assertEquals(JSON.stringify(out).includes("s3cret"), false);
});

Deno.test("list-webhooks: domainId is required", () => {
  assertEquals(action.params!.find((p) => p.key === "domainId")?.required, true);
});
