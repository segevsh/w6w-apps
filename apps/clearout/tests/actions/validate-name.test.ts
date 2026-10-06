import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/validate-name.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("validate-name: nests the threshold under settings and maps the flags", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        input_name: "Asdf Qwer",
        status: "invalid",
        profanity: false,
        gibberish: true,
        time_taken: 40,
      },
    },
  }]);
  const out = await run(
    action,
    { name: "Asdf Qwer", gibberishThreshold: "medium", timeout: 5000 },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.clearout.io/v2/name/validate");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Asdf Qwer",
    settings: { gibberish_threshold: "medium" },
    timeout: 5000,
  });
  assertEquals(out, {
    inputName: "Asdf Qwer",
    status: "invalid",
    profanity: false,
    gibberish: true,
    timeTaken: 40,
  });
});

Deno.test("validate-name: settings omitted when no threshold; blank name throws", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: {} } }]);
  await run(action, { name: "Ann" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Ann" });
  await assertRejects(() => run(action, { name: "" }, mockCtx().ctx), Error, "name is required");
});
