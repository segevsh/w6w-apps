import { assertEquals, assertRejects } from "@std/assert";
import callMake from "../../actions/call-make.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("call-make: POST /calls, drops unset fields, folds eta into the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ answer: "Call initiated", call_id: "c1" }, { eta: 7 }),
  }]);
  const out = await callMake.execute(
    { model_id: "m1", phone: "+14155551234", name: "Ada", custom_variables: { city: "Berlin" } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/calls");
  assertEquals(JSON.parse(calls[0].body!), {
    model_id: "m1",
    phone: "+14155551234",
    name: "Ada",
    custom_variables: [{ key: "city", value: "Berlin" }],
  });
  assertEquals(out, { answer: "Call initiated", call_id: "c1", eta: 7 });
});

Deno.test("call-make: custom variables given as a JSON string of key/value pairs pass through", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ call_id: "c1" }, { eta: 1 }) }]);
  await callMake.execute(
    { model_id: "m", phone: "+1", name: "n", custom_variables: '[{"key":"a","value":"b"}]' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).custom_variables, [{ key: "a", value: "b" }]);
});

Deno.test("call-make: invalid custom_variables JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await callMake.execute(
        { model_id: "m", phone: "+1", name: "n", custom_variables: "{nope" },
        ctx,
      );
    },
    Error,
    "custom_variables is not valid JSON",
  );
  assertEquals(calls.length, 0);
});
