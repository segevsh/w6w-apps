import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-cancel.ts";

Deno.test("appointment-cancel: PUTs /appointments/{id}/cancel with note and query flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, noShow: false } }]);
  await action.execute(
    { id: 42, cancelNote: "Client requested", admin: true, noEmail: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/appointments/42/cancel");
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.searchParams.get("admin"), "true");
  assertEquals(url.searchParams.get("noEmail"), "true");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cancelNote, "Client requested");
});

Deno.test("appointment-cancel: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
