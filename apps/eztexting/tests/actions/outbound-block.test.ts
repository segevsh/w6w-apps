import { assertEquals, assertRejects } from "@std/assert";
import outboundBlock from "../../actions/outbound-block.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("outbound-block: calls POST /blocks and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await outboundBlock.execute(
    { "phoneNumbers": "2125551234, 2125559999" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/blocks`);
  assertEquals(bodyOf(calls[0]), { "phoneNumbers": ["2125551234", "2125559999"] });
  assertEquals(result, { "phoneNumbers": ["2125551234", "2125559999"], "status": 200 });
});

Deno.test("outbound-block: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await outboundBlock.execute({ "phoneNumbers": "2125551234, 2125559999" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("outbound-block: needs at least one number", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await outboundBlock.execute({ phoneNumbers: [] }, ctx),
    Error,
    "at least one",
  );
});
