import type { AppDefinition } from "@w6w/types";
import bucketList from "./actions/bucket-list.ts";
import bucketCreate from "./actions/bucket-create.ts";
import bucketDelete from "./actions/bucket-delete.ts";
import objectList from "./actions/object-list.ts";
import objectGet from "./actions/object-get.ts";
import objectPut from "./actions/object-put.ts";
import objectDelete from "./actions/object-delete.ts";
import objectCopy from "./actions/object-copy.ts";
import objectHead from "./actions/object-head.ts";
import awsIam from "./auth/aws-iam.ts";
import service from "./health/service.ts";

export default {
  actions: [
    bucketList,
    bucketCreate,
    bucketDelete,
    objectList,
    objectGet,
    objectPut,
    objectDelete,
    objectCopy,
    objectHead,
  ],
  auth: [awsIam],
  healthChecks: [service],
} satisfies AppDefinition;
