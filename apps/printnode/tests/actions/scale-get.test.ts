import { assertEquals, assertRejects } from "@std/assert";
import scaleGet from "../../actions/scale-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("scale-get: GET /computer/{id}/scale/{name}/{num} (singular scale)", async () => {
  const { ctx, calls } = mockCtx([{ body: { mass: [779000000, null], ageOfData: 164 } }]);
  const out = await scaleGet.execute({
    computerId: 0,
    deviceName: "PrintNode Test Scale",
    deviceNumber: 0,
  }, ctx) as {
    ageOfData: number;
  };
  assertEquals(
    calls[0].url,
    "https://api.printnode.com/computer/0/scale/PrintNode%20Test%20Scale/0",
  );
  assertEquals(out.ageOfData, 164);
});

Deno.test("scale-get: device number defaults to 0; a 404 surfaces the vendor message", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: { code: "ResourceNotFound", message: "Unable to find any scales" },
  }]);
  await assertRejects(
    async () => await scaleGet.execute({ computerId: 12, deviceName: "nope" }, ctx),
    Error,
    "404 ResourceNotFound",
  );
  assertEquals(calls[0].url.endsWith("/computer/12/scale/nope/0"), true);
});

Deno.test("scale-get: device name is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await scaleGet.execute({ computerId: 1, deviceName: " " }, ctx),
    Error,
    "required",
  );
});
