import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/**
 * Newest-first (brief 9.1 a): `GET /users/v1/users` takes `sort=created_at` and `order=desc`
 * (`UsersSortKeysExternal` enum `["created_at"]`, `SortOrder` `["asc","desc"]`) in the OpenAPI
 * document https://developer.connecteam.com/openapi/connecteam-api-documentation.json (verified
 * 2026-11-10); `limit` is capped at 500.
 */
export default pollFromListAction({
  key: "new-user",
  title: "New User",
  description: "The run gets each active employee newly added to the Connecteam account.",
  action: userList as unknown as ActionDefinition,
  input: () => ({ sort: "created_at", order: "desc", limit: 100, offset: 0 }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { userId: unknown }).userId),
  output: [
    { key: "userId", type: "number", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phoneNumber", type: "string", label: "Phone number" },
    { key: "userType", type: "string", label: "User type" },
    { key: "createdAt", type: "number", label: "Created at (Unix seconds)" },
  ],
  sample: {
    userId: 9001,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phoneNumber: "+15555550123",
    userType: "user",
    createdAt: 1762680000,
  },
  maxPages: 1,
});
