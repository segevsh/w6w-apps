import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  boardId: string;
  language?: string;
  countryCode?: string;
  boardType?: string;
  page?: number;
}

/** `GET /api/v1/users/current/leaderboards/${seg(input.boardId)}` */
const leaderboardGet: ActionDefinition<Input> = {
  key: "leaderboard-get",
  type: "read",
  resource: "leaderboard",
  title: "Get Private Leaderboard",
  description: "The members of a private leaderboard ranked by coding activity.",
  params: [
    {
      key: "boardId",
      label: "Leaderboard ID",
      type: "string",
      required: true,
      hint: "The id from List Private Leaderboards.",
    },
    { key: "language", label: "Language", type: "string", hint: "Only this language." },
    { key: "countryCode", label: "Country code", type: "string", hint: "Two-letter country code." },
    {
      key: "boardType",
      label: "Board type",
      type: "select",
      hint: "Ranking type. Defaults to time.",
      options: [
        { value: "time", label: "Hours coded" },
        { value: "manual", label: "Hours coded excluding AI" },
        { value: "ai", label: "AI lines" },
        { value: "spend", label: "AI spend" },
      ],
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Defaults to the page containing the current user.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Ranked members" },
    { key: "current_user", type: "object", label: "The caller's rank" },
    { key: "page", type: "number", label: "Current page" },
    { key: "total_pages", type: "number", label: "Total pages" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/leaderboards/${seg(input.boardId)}`, {
      query: {
        language: input.language,
        country_code: input.countryCode,
        board_type: input.boardType,
        page: input.page,
      },
    });
  },
};

export default leaderboardGet;
