/**
 * Module dependencies.
 */
'use strict'

const Counter = require('passthrough-counter')
const humanize = require('humanize-number')
const bytes = require('bytes')
const chalk = require('chalk')
const util = require('util')
const debug = require('debug')('app');
const mongoose = require('mongoose');
const { accessLogger } = require('../../service/logger');

/**
 * Expose logger.
 */

module.exports = dev

/**
 * Development logger.
 */

function dev(winston, opts) {
  return async function logger(ctx, next) {
    // request
    const start = ctx[Symbol.for('request-received.startTime')] ? ctx[Symbol.for('request-received.startTime')].getTime() : Date.now()

    try {
      await next()
    } catch (err) {
      // log uncaught downstream errors
      log(winston, ctx, start, null, err)
      throw err
    }

    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    const length = ctx.response.length
    const body = ctx.body
    let counter
    if (length == null && body && body.readable) {
      ctx.body = body
        .pipe(counter = Counter())
        .on('error', ctx.onerror)
    }

    // log when the response is finished or closed,
    // whichever happens first.
    const res = ctx.res

    const onfinish = done.bind(null, 'finish')
    const onclose = done.bind(null, 'close')

    res.once('finish', onfinish)
    res.once('close', onclose)

    async function done(event) {
      res.removeListener('finish', onfinish)
      res.removeListener('close', onclose)
      await log(winston, ctx, start, counter ? counter.length : length, null, event)
    }
  }
}

/**
 * Log helper.
 */

async function log(winston, ctx, start, len, err, event) {
  if (process.env.NODE_ENV === 'test') return;
  if (ctx.path.startsWith('/api/assets')) return;

  // get the status code of the response
  const status = err
    ? (err.isBoom ? err.output.statusCode : err.status || 500)
    : (ctx.status || 404);

  // get the human readable response length
  let length;
  if (~[204, 205, 304].indexOf(status)) {
    length = 0;
  } else if (len == null) {
    length = null;
  } else {
    length = len;
  }

  let level = err || status >= 400 ? 'warn' : 'info';
  let message = `${ctx.method} ${ctx.originalUrl} ${status} ${time(start)} ${length ? bytes(length).toLowerCase() : '-'}`;
  accessLogger.log(level, message, {
    route: `${ctx.method} ${ctx.path}`,
    req: {
      ip: ctx.ip,
      userAgent: ctx.userAgent.source,
      method: ctx.method,
      path: ctx.path,
      originalUrl: ctx.originalUrl,
    },
    res: {
      status,
      time: Date.now() - start,
      length
    }
  });
}

/**
 * Show the response time in a human readable format.
 * In milliseconds if less than 10 seconds,
 * in seconds otherwise.
 */

function time(start) {
  const delta = Date.now() - start
  return humanize(delta < 10000
    ? delta + 'ms'
    : Math.round(delta / 1000) + 's')
}