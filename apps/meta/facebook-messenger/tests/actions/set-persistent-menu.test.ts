import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/set-persistent-menu.ts";

const menu = {
  locale: "default",
  composer_input_disabled: false,
  call_to_actions: [{ type: "postback", title: "Talk to an agent", payload: "CARE_HELP" }],
};

Deno.test("set-persistent-menu: sends persistent_menu to the profile endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  await action.execute!({ menus: [menu] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/messenger_profile");
  assertEquals(bodyOf(calls[0]), { persistent_menu: [menu] });
});

Deno.test("set-persistent-menu: requires a default-locale menu", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ menus: [{ ...menu, locale: "zh_CN" }] }, ctx),
    Error,
    "default",
  );
  await assertRejects(async () => await action.execute!({ menus: [] }, ctx), Error, "non-empty");
  assertEquals(calls.length, 0);
});

Deno.test("set-persistent-menu: more than 20 items are rejected locally", async () => {
  const { ctx, calls } = mockCtx();
  const big = { ...menu, call_to_actions: Array(21).fill(menu.call_to_actions[0]) };
  await assertRejects(async () => await action.execute!({ menus: [big] }, ctx), Error, "20");
  assertEquals(calls.length, 0);
});
