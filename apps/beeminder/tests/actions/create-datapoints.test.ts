import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-datapoints.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("create-datapoints: sends the array as a JSON string form field", async () => {
  const pts = [{ timestamp: 1343577600, value: 220.6, requestid: "a" }, { value: 220.7 }];
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", value: 220.6 }, { id: "2", value: 220.7 }],
  }]);
  const out = await run(action, { slug: "w", datapoints: pts }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/w/datapoints/create_all.json",
  );
  assertEquals(JSON.parse(new URLSearchParams(calls[0].body!).get("datapoints")!), pts);
  assertEquals(out.count, 2);
  assertEquals(out.errors, []);
});

Deno.test("create-datapoints: a {successes, errors} body is split; a JSON string input parses", async () => {
  const { ctx, calls } = mockCtx([{
    body: { successes: [{ id: "1", value: 1 }], errors: [{ value: "bad" }] },
  }]);
  const out = await run(action, { slug: "w", datapoints: '[{"value":1},{"value":"x"}]' }, ctx);
  assertEquals(out.count, 1);
  assertEquals(out.errors, [{ value: "bad" }]);
  assertEquals(JSON.parse(new URLSearchParams(calls[0].body!).get("datapoints")!).length, 2);
});

Deno.test("create-datapoints: an empty list throws before a call; errors surface", async () => {
  const none = mockCtx();
  await assertRejects(
    () => run(action, { slug: "w", datapoints: [] }, none.ctx),
    Error,
    "non-empty",
  );
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{ status: 404, body: { errors: "no goal" } }]);
  await assertRejects(
    () => run(action, { slug: "w", datapoints: [{ value: 1 }] }, bad.ctx),
    Error,
    "no goal",
  );
});
