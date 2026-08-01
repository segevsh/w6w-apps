import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/stats-get.ts";

Deno.test("stats-get: GETs /v3/{domain}/stats/total with repeated event params", async () => {
  const { ctx, calls } = mockCtx([{ body: { stats: [] } }]);
  await action.execute!(
    { domain: "mg.example.com", event: ["delivered", "opened"], resolution: "hour" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/mg.example.com/stats/total");
  assertEquals(url.searchParams.getAll("event"), ["delivered", "opened"]);
  assertEquals(url.searchParams.get("resolution"), "hour");
});

Deno.test("stats-get: accepts a single string event value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ domain: "mg.example.com", event: "delivered" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("event"), ["delivered"]);
});

Deno.test("stats-get: requires domain and at least one event", async () => {
  const { ctx: ctx1 } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ domain: "", event: ["x"] }, ctx1),
    Error,
    "`domain`",
  );

  const { ctx: ctx2 } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ domain: "mg.example.com", event: [] }, ctx2),
    Error,
    "`event`",
  );
});
