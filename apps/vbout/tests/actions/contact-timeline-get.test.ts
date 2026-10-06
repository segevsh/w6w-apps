import { assert, assertEquals, assertRejects } from "@std/assert";
import contactTimelineGet from "../../actions/contact-timeline-get.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-timeline-get: GETs emailmarketing/getcontacttimeline.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "id": 123, "timeline": { "data": [] } }) }]);
  const out = await contactTimelineGet.execute({ "id": "3", "include": "utm" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getcontacttimeline.json");
  assertEquals(queryOf(calls[0].url), { "id": "3", "include": "utm" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "id": 123, "timeline": { "data": [] } });
});

Deno.test("contact-timeline-get: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "id": 123, "timeline": { "data": [] } }) }]);
  await contactTimelineGet.execute({ "id": "3", "include": "utm" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(contactTimelineGet.type, "read");
});

Deno.test("contact-timeline-get: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactTimelineGet.execute({ "id": "3", "include": "utm" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
