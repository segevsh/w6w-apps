/**
 * Upstash Redis — HTTP REST API only.
 *
 * "Redis" was the original ask, but w6w Apps run in a network-less sandbox
 * that reaches the network exclusively through `ctx.fetch` over HTTP(S) to
 * hosts on a static allowlist — there is no raw TCP socket access. Generic
 * Redis speaks the RESP wire protocol over a TCP socket, which this sandbox
 * genuinely cannot support for any deployment, self-hosted or otherwise.
 *
 * Upstash is a real fit instead: every Upstash Redis database exposes the
 * full command set over a genuine HTTP REST API at its own
 * `https://<db-id>.upstash.io` host, which is exactly what `ctx.fetch` plus
 * a `*.upstash.io` allowlist entry was built for. This app is Upstash's
 * REST API, not wire-protocol Redis — see README.md.
 */
import type { AppDefinition } from "@w6w/types";
import restToken from "./auth/rest-token.ts";

import get from "./actions/get.ts";
import set from "./actions/set.ts";
import del from "./actions/del.ts";
import incr from "./actions/incr.ts";
import decr from "./actions/decr.ts";
import expire from "./actions/expire.ts";
import exists from "./actions/exists.ts";
import lpush from "./actions/lpush.ts";
import rpush from "./actions/rpush.ts";
import lrange from "./actions/lrange.ts";
import hget from "./actions/hget.ts";
import hset from "./actions/hset.ts";
import hgetall from "./actions/hgetall.ts";
import sadd from "./actions/sadd.ts";
import smembers from "./actions/smembers.ts";

import service from "./health/service.ts";
import host from "./health/host.ts";

export default {
  actions: [
    // string
    get,
    set,
    incr,
    decr,
    // generic
    del,
    expire,
    exists,
    // list
    lpush,
    rpush,
    lrange,
    // hash
    hget,
    hset,
    hgetall,
    // set
    sadd,
    smembers,
  ],
  auth: [restToken],
  healthChecks: [service, host],
} satisfies AppDefinition;
