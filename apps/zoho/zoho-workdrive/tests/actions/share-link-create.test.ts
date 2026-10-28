import { assertEquals } from "@std/assert";
import shareLinkCreate from "../../actions/share-link-create.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("share-link-create: POST /workdrive/api/v1/links", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: {
      "data": {
        "id": "L1",
        "type": "links",
        "attributes": { "link": "https://workdrive.zohoexternal.com/external/L1/download" },
      },
    },
  }]);
  const res = await shareLinkCreate.execute(
    {
      "resourceId": "f1",
      "linkName": "r",
      "expirationDate": "2027-01-01 00:00:00",
      "downloadLimit": 5,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/links");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "links",
      "attributes": {
        "resource_id": "f1",
        "link_name": "r",
        "request_user_data": false,
        "allow_download": true,
        "expiration_date": "2027-01-01 00:00:00",
        "download_link": { "download_limit": 5 },
      },
    },
  });
  assertEquals(res.item, {
    "id": "L1",
    "type": "links",
    "attributes": { "link": "https://workdrive.zohoexternal.com/external/L1/download" },
  });
});
