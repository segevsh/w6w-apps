import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PATCHes only what was given", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ contactId: "cnt_1", name: "Ada L." }, ctx), { ok: true });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada L." });
});

Deno.test("contact-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ contactId: "cnt_1" }, ctx),
    Error,
    "nothing",
  );
  assertEquals(calls.length, 0);
});

/** Handles are identities; replacing the array would orphan history. */
Deno.test("contact-update: offers no handles field", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("handles"), keys.join(","));
});

Deno.test("contact-update: the custom-fields param warns that omissions are erased", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "customFields")!;
  assert(/erase/i.test(p.hint!), p.hint);
});
