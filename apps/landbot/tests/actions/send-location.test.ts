import { assertEquals, assertRejects } from "@std/assert";
import sendLocation from "../../actions/send-location.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("send-location: POST /customers/42/send_location/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await sendLocation.execute(
    { "customerId": 42, "latitude": 40.4168, "longitude": -3.7038 } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/send_location/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "latitude": 40.4168,
    "longitude": -3.7038,
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("send-location: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendLocation.execute(
          { "customerId": 42, "latitude": 40.4168, "longitude": -3.7038 } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("send-location: declares perform", () => {
  assertEquals(sendLocation.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
