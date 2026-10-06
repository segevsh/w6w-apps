import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-custom-audience.ts";

const form = (body: string | null) => new URLSearchParams(body ?? "");

Deno.test("update-custom-audience: POSTs only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ audienceId: "900", name: "Renamed", optOutLink: "https://x.test/o" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/900");
  const f = form(calls[0].body);
  assertEquals([...f.keys()].sort(), ["name", "opt_out_link"]);
});

Deno.test("update-custom-audience: no fields is an error with no call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ audienceId: "900" }, ctx)),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});
