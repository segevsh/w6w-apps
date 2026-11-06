import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "get-hosted-profile-page",
  "title": "Get Hosted Profile Page Token",
  "description":
    "Obtain a hosted customer profile management form token for the same connection environment.",
  "resource": "hosted-form",
  "type": "perform",
  "request": "getHostedProfilePageRequest",
  "params": [
    {
      "key": "customerProfileId",
      "label": "Customer profile ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "hostedProfileSettings",
      "label": "Hosted profile settings",
      "type": "json",
      "hint":
        '{"setting":[{"settingName":"documented setting name","settingValue":"string or JSON-encoded string"}]}. The value remains an opaque string.',
    },
  ],
  "output": [
    {
      "key": "refId",
      "type": "string",
      "label": "Reference ID",
    },
    {
      "key": "messages",
      "type": "object",
      "label": "Messages",
    },
    {
      "key": "sessionToken",
      "type": "string",
      "label": "Session token",
    },
    {
      "key": "token",
      "type": "string",
      "label": "Token",
    },
  ],
});
