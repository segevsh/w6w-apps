import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";
import presentationCreate from "./actions/presentation-create.ts";
import presentationGet from "./actions/presentation-get.ts";
import presentationBatchUpdate from "./actions/presentation-batch-update.ts";
import pageGet from "./actions/page-get.ts";
import pageGetThumbnail from "./actions/page-get-thumbnail.ts";
import slideCreate from "./actions/slide-create.ts";
import slideMove from "./actions/slide-move.ts";
import objectDuplicate from "./actions/object-duplicate.ts";
import objectDelete from "./actions/object-delete.ts";
import textInsert from "./actions/text-insert.ts";
import textDelete from "./actions/text-delete.ts";
import textReplaceAll from "./actions/text-replace-all.ts";
import shapesReplaceWithImage from "./actions/shapes-replace-with-image.ts";
import imageCreate from "./actions/image-create.ts";
import shapeCreate from "./actions/shape-create.ts";
import tableCreate from "./actions/table-create.ts";
import elementAltTextUpdate from "./actions/element-alt-text-update.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    presentationCreate,
    presentationGet,
    presentationBatchUpdate,
    pageGet,
    pageGetThumbnail,
    slideCreate,
    slideMove,
    objectDuplicate,
    objectDelete,
    textInsert,
    textDelete,
    textReplaceAll,
    shapesReplaceWithImage,
    imageCreate,
    shapeCreate,
    tableCreate,
    elementAltTextUpdate,
  ],
  auth: [oauth2, serviceAccount],
  healthChecks: [service, quota],
} satisfies AppDefinition;
