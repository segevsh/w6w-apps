import type { ActionDefinition } from "@w6w/types";
import { encodeId, obj, SolapiClient } from "../lib/client.ts";

/**
 * Get Kakao Template — Get one AlimTalk template: its content with #{placeholders}, buttons, review status and comments.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  templateId: string;
}

const getKakaoTemplate: ActionDefinition<Input> = {
  key: "get-kakao-template",
  type: "read",
  resource: "kakao",
  title: "Get Kakao Template",
  description:
    "Get one AlimTalk template: its content with #{placeholders}, buttons, review status and comments.",
  params: [
    {
      "key": "templateId",
      "label": "Template ID",
      "type": "string",
      "required": true,
      "hint": "From List Kakao Templates.",
    },
  ],
  output: [
    {
      "key": "template",
      "type": "object",
      "label": "The template object",
    },
  ],

  async execute(input, ctx) {
    return {
      template: obj(
        await new SolapiClient(ctx).json(`/kakao/v2/templates/${encodeId(input.templateId)}`),
      ),
    };
  },
};

export default getKakaoTemplate;
