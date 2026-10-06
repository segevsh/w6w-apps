import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import update from "../../actions/deal-update.ts";

const B = "https://acme.salesmate.io/apis/deal/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("deal-update: PUTs to /deal/v4/:id without the id in the body", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 3 })]);
  await update.execute(
    {
      dealId: 3,
      ...{
        "title": "Big",
        "primaryContact": 5,
        "owner": 1,
        "pipeline": "Sales",
        "stage": "New",
        "status": "Open",
      },
    } as never,
    ctx,
  );
  assertEquals(calls[0].url, `${B}/3`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    "title": "Big",
    "primaryContact": 5,
    "owner": 1,
    "pipeline": "Sales",
    "stage": "New",
    "status": "Open",
  });
});
