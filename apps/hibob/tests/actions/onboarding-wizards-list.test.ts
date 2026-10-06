import { assertEquals } from "@std/assert";
import wizards from "../../actions/onboarding-wizards-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("onboarding-wizards-list: GETs /v1/onboarding/wizards", async () => {
  const { ctx, calls } = mockCtx([{ body: { wizards: [{ id: 1, name: "Default" }] } }]);
  const out = await wizards.execute({}, ctx) as { wizards: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/onboarding/wizards");
  assertEquals(out.wizards.length, 1);
});
