import { assertEquals, assertRejects } from "@std/assert";
import sendImage from "../../actions/send-image.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("send-image: POST /customers/42/send_image/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await sendImage.execute(
    { "customerId": 42, "url": "https://x.co/a.png", "caption": "Hi" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/send_image/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "url": "https://x.co/a.png",
    "caption": "Hi",
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("send-image: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendImage.execute(
          { "customerId": 42, "url": "https://x.co/a.png", "caption": "Hi" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("send-image: declares perform", () => {
  assertEquals(sendImage.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
