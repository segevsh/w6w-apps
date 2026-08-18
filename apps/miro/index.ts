/**
 * Miro — build and read boards: sticky notes, cards, shapes, frames, images,
 * connectors, tags and members.
 *
 * Every path, parameter, required body field and response shape was taken from
 * Miro's own OpenAPI document
 * (https://raw.githubusercontent.com/miroapp/api-clients/main/packages/generator/spec.json,
 * "Miro Developer Platform" v2.0, 114 paths, fetched 2026-08-18 — the `miroapp`
 * org's own repository, not a fork). It names one server,
 * `https://api.miro.com/`, and one security scheme, `oAuth2AuthCode`.
 *
 * Three things about that document shape this app:
 *
 *   - **Renamed path parameters are generator artifacts.** Several board
 *     endpoints appear as `/v2/boards/{board_id_PlatformTags}/…`,
 *     `{board_id_PlatformContainers}`, `{board_id_PlatformFileUpload}` — the
 *     parameter is renamed per tag so the same path can appear more than once.
 *     Each one's description is the same "Unique identifier (ID) of the board",
 *     and on the wire they are all `/v2/boards/{board_id}/…`. A generator that
 *     took the templates literally would emit URLs Miro does not serve.
 *   - **Two pagination contracts, not one.** `GET /v2/boards`, the tag lists,
 *     the by-tag item list and board members are **offset**-paginated
 *     (`{data,total,size,offset,limit}`); the board item and connector
 *     collections are **cursor**-paginated (`{data,total,size,cursor,limit}`).
 *     `lib/client.ts` keeps them apart because they are not interchangeable.
 *   - **Experimental paths are avoided.** `/v2-experimental/…` carries mindmap
 *     nodes, code widgets and flowchart shapes. Miro reserves the right to
 *     change those without a version bump, so this app uses the stable `/v2`
 *     equivalents and does not expose the experimental-only types.
 *
 * Deliberately out of scope:
 *   - **File uploads.** The image and document endpoints have a multipart arm
 *     for uploading from a device; that is not a shape an action's JSON body
 *     expresses, so `image-create` takes a URL and says so.
 *   - **The Enterprise surface** — `/v2/orgs/…` for organizations, teams,
 *     projects, audit logs, legal holds, board exports and data classification.
 *     It is a large, plan-gated administration API needing scopes this app
 *     deliberately does not request, and deserves its own app if it is wanted.
 *   - **SCIM** (`/Users`, `/Groups`, `/Schemas` at the document root) —
 *     directory provisioning, not board automation.
 *   - **App cards, embeds, documents and mindmaps.** Real board item types, but
 *     each is its own resource with its own fields; the seven types here are
 *     the ones a board-building workflow reaches for.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import boardList from "./actions/board-list.ts";
import boardGet from "./actions/board-get.ts";
import boardCreate from "./actions/board-create.ts";
import boardCopy from "./actions/board-copy.ts";
import boardUpdate from "./actions/board-update.ts";
import boardDelete from "./actions/board-delete.ts";
import itemList from "./actions/item-list.ts";
import itemListInFrame from "./actions/item-list-in-frame.ts";
import itemListByTag from "./actions/item-list-by-tag.ts";
import itemGet from "./actions/item-get.ts";
import itemMove from "./actions/item-move.ts";
import itemDelete from "./actions/item-delete.ts";
import itemsCreateBulk from "./actions/items-create-bulk.ts";
import stickyNoteCreate from "./actions/sticky-note-create.ts";
import stickyNoteUpdate from "./actions/sticky-note-update.ts";
import cardCreate from "./actions/card-create.ts";
import textCreate from "./actions/text-create.ts";
import shapeCreate from "./actions/shape-create.ts";
import frameCreate from "./actions/frame-create.ts";
import imageCreate from "./actions/image-create.ts";
import connectorCreate from "./actions/connector-create.ts";
import connectorList from "./actions/connector-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagList from "./actions/tag-list.ts";
import tagAttach from "./actions/tag-attach.ts";
import boardMemberList from "./actions/board-member-list.ts";
import boardShare from "./actions/board-share.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // board
    boardList,
    boardGet,
    boardCreate,
    boardCopy,
    boardUpdate,
    boardDelete,
    // item (any type)
    itemList,
    itemListInFrame,
    itemListByTag,
    itemGet,
    itemMove,
    itemDelete,
    itemsCreateBulk,
    // typed items
    stickyNoteCreate,
    stickyNoteUpdate,
    cardCreate,
    textCreate,
    shapeCreate,
    frameCreate,
    imageCreate,
    // connector
    connectorCreate,
    connectorList,
    // tag
    tagCreate,
    tagList,
    tagAttach,
    // member
    boardMemberList,
    boardShare,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
