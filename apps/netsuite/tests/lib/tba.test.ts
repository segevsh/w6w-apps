import { assert, assertEquals } from "@std/assert";
import {
  baseString,
  realmOf,
  rfc3986,
  tbaAuthorization,
  type TbaCredential,
} from "../../lib/tba.ts";

/** Every value below is Oracle's published example from "The Signature for Web Services and RESTlets". */
const CRED: TbaCredential = {
  accountId: "123456",
  consumerKey: "ef40afdd8abaac111b13825dd5e5e2ddddb44f86d5a0dd6dcf38c20aae6b67e4",
  consumerSecret: "d26ad321a4b2f23b0741c8d38392ce01c3e23e109df6c96eac6d099e9ab9e8b5",
  tokenId: "2b0ce516420110bcbd36b69e99196d1b7f6de3c6234c5afb799b73d87569f5cc",
  tokenSecret: "c29a677df7d5439a458c063654187e3d678d73aca8e3c9d8bea1478a3eb0d295",
};
const URL_ = "https://123456.suitetalk.api.netsuite.com/services/rest/record/v1/employee/40";
const NONCE = "fjaLirsIcCGVZWzBX0pg";
const TS = "1508242306";

Deno.test("tba: base string matches Oracle's REST web services example byte for byte", () => {
  const bs = baseString("GET", URL_, {
    oauth_consumer_key: CRED.consumerKey,
    oauth_nonce: NONCE,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: TS,
    oauth_token: CRED.tokenId,
    oauth_version: "1.0",
  });
  assertEquals(
    bs,
    "GET&https%3A%2F%2F123456.suitetalk.api.netsuite.com%2Fservices%2Frest%2Frecord%2Fv1%2Femployee%2F40" +
      "&oauth_consumer_key%3Def40afdd8abaac111b13825dd5e5e2ddddb44f86d5a0dd6dcf38c20aae6b67e4" +
      "%26oauth_nonce%3DfjaLirsIcCGVZWzBX0pg%26oauth_signature_method%3DHMAC-SHA256" +
      "%26oauth_timestamp%3D1508242306" +
      "%26oauth_token%3D2b0ce516420110bcbd36b69e99196d1b7f6de3c6234c5afb799b73d87569f5cc" +
      "%26oauth_version%3D1.0",
  );
});

Deno.test("tba: known-answer — the signature is Oracle's published B5OIWznZ…", async () => {
  const header = await tbaAuthorization("GET", URL_, CRED, NONCE, TS);
  // Oracle's published "REST Web Services Header Example", verbatim.
  assertEquals(
    header,
    'OAuth realm="123456", oauth_token="2b0ce516420110bcbd36b69e99196d1b7f6de3c6234c5afb799b73d87569f5cc", ' +
      'oauth_consumer_key="ef40afdd8abaac111b13825dd5e5e2ddddb44f86d5a0dd6dcf38c20aae6b67e4", ' +
      'oauth_nonce="fjaLirsIcCGVZWzBX0pg", oauth_timestamp="1508242306", ' +
      'oauth_signature_method="HMAC-SHA256", oauth_version="1.0", ' +
      'oauth_signature="B5OIWznZ2YP0OB7VrJrGkYsTh%2B8H%2B5T9Hag%2Bo92q0zY%3D"',
  );
});

Deno.test("tba: a different method, secret or URL changes the signature", async () => {
  const sig = (h: string) => h.match(/oauth_signature="([^"]+)"/)![1];
  const base = sig(await tbaAuthorization("GET", URL_, CRED, NONCE, TS));
  assert(sig(await tbaAuthorization("POST", URL_, CRED, NONCE, TS)) !== base);
  assert(sig(await tbaAuthorization("GET", URL_ + "1", CRED, NONCE, TS)) !== base);
  assert(
    sig(await tbaAuthorization("GET", URL_, { ...CRED, tokenSecret: "x" }, NONCE, TS)) !== base,
  );
});

Deno.test("tba: query parameters join the base string, sorted and percent-encoded", () => {
  const bs = baseString(
    "GET",
    "https://a.suitetalk.api.netsuite.com/p?q=email%20IS%20%22a%22&limit=5",
    {
      oauth_nonce: "n",
    },
  );
  assertEquals(
    bs,
    "GET&https%3A%2F%2Fa.suitetalk.api.netsuite.com%2Fp&limit%3D5%26oauth_nonce%3Dn" +
      "%26q%3Demail%2520IS%2520%2522a%2522",
  );
});

Deno.test("tba: realm is NetSuite's own form, rfc3986 escapes what encodeURIComponent leaves", () => {
  assertEquals(realmOf("1234567-sb1"), "1234567_SB1");
  assertEquals(realmOf("tstdrv9"), "TSTDRV9");
  assertEquals(rfc3986("a!'()*b"), "a%21%27%28%29%2Ab");
});
