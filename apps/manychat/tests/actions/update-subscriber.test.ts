import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateSubscriber from "../../actions/update-subscriber.ts";

const OK = { body: { status: "success", data: { id: "1" } } };

Deno.test("update-subscriber: POSTs subscriber_id plus only the touched fields", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await updateSubscriber.execute!({ subscriberId: "1", firstName: "Ada" }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/subscriber/updateSubscriber");
  assertEquals(JSON.parse(calls[0].body!), { subscriber_id: "1", first_name: "Ada" });
});

Deno.test("update-subscriber: an untouched field is omitted, never sent as null", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await updateSubscriber.execute!({ subscriberId: "1", email: "a@x.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("last_name" in body), "a partial update must not blank an untouched name");
  assert(!("phone" in body));
});

Deno.test("update-subscriber: offers no whatsappPhone — the endpoint does not accept it", () => {
  // createSubscriber takes whatsapp_phone; updateSubscriber's schema does not
  // list it at all.
  const keys = (updateSubscriber.params ?? []).map((p) => p.key);
  assert(!keys.includes("whatsappPhone"), keys.join(","));
});

Deno.test("update-subscriber: the id is not parsed to a number", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await updateSubscriber.execute!({ subscriberId: "9007199254740993" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).subscriber_id, "9007199254740993");
});

Deno.test("update-subscriber: is idempotent — every field is an absolute write", () => {
  assertEquals(updateSubscriber.idempotent, true);
});
