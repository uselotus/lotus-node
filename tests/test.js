const { spy, stub } = require('sinon')
const bodyParser = require('body-parser')
const express = require('express')
const delay = require('delay')
const pify = require('pify')
const test = require('ava')
const axios = require('axios')
const Lotus = require('../index')

const noop = () => {}

const port = 6042

const createClient = (options) => {
    options = Object.assign(
        {
            host: `http://localhost:${port}`,
        },
        options
    )

    const client = new Lotus('key', options)
    client.flush = pify(client.flush.bind(client))
    client.flushed = true

    return client
}

test.before.cb((t) => {
    express()
        .use(bodyParser.json())
        .post('/api/track/', (req, res) => {
            const { batch } = req.body
            if (!req.headers['x-api-key']) {
                return res.status(400).json({
                    error: { message: 'missing api key' },
                })
            }

            const ua = req.headers['user-agent']
            if (ua !== `lotus-node`) {
                return res.status(400).json({
                    error: { message: 'invalid user-agent' },
                })
            }

            if (batch[0] === 'error') {
                return res.status(400).json({
                    error: { message: 'error' },
                })
            }

            if (batch[0] === 'timeout') {
                return setTimeout(() => res.end(), 5000)
            }
            res.json({})
        })
        .listen(port, t.end)
})

let requestSpy = spy(axios, 'request')

test.afterEach(() => {
    requestSpy.resetHistory()
})

test('expose a constructor', (t) => {
    t.is(typeof Lotus, 'function')
})

test('require a api key', (t) => {
    t.throws(() => new Lotus(), { message: "You must pass your Lotus organization's api key." })
})

test('create a queue', (t) => {
    const client = createClient()

    t.deepEqual(client.queue, [])
})

test('default options', (t) => {
    const client = new Lotus('key')

    t.is(client.apiKey, 'key')
    t.is(client.host, 'https://www.uselotus.app')
    t.is(client.flushAt, 20)
    t.is(client.flushInterval, 10000)
})

test('remove trailing slashes from `host`', (t) => {
    const client = new Lotus('key', { host: 'http://google.com///' })

    t.is(client.host, 'http://google.com')
})

test('overwrite defaults with options', (t) => {
    const client = new Lotus('key', {
        host: 'a',
        flushAt: 1,
        flushInterval: 2,
    })

    t.is(client.host, 'a')
    t.is(client.flushAt, 1)
    t.is(client.flushInterval, 2)
})

test('keep the flushAt option above zero', (t) => {
    const client = createClient({ flushAt: 0 })

    t.is(client.flushAt, 1)
})

// test('enqueue - add a message to the queue', (t) => {
//     const client = createClient()

//     const time_created = new Date()
//     client.enqueue('type', { time_created }, noop)

//     t.is(client.queue.length, 1)

//     const item = client.queue.pop()

//     // t.is(typeof item.message.messageId, 'string')
//     // t.regex(item.message.messageId, /node-[a-zA-Z0-9]{32}/)
//     t.deepEqual(item, {
//         message: {
//             time_created,
//             library: 'lotus-node',
//             type: 'type',
//         },
//         callback: noop,
//     })
// })

test("enqueue - don't modify the original message", (t) => {
    const client = createClient()
    const message = { eventName: 'test' }

    client.enqueue('type', message)

    t.deepEqual(message, { eventName: 'test' })
})

test('enqueue - flush on first message', (t) => {
    const client = createClient({ flushAt: 2 })
    client.flushed = false
    spy(client, 'flush')

    client.enqueue('type', {})
    t.true(client.flush.calledOnce)

    client.enqueue('type', {})
    t.true(client.flush.calledOnce)

    client.enqueue('type', {})
    t.true(client.flush.calledTwice)
})

test('enqueue - flush the queue if it hits the max length', (t) => {
    const client = createClient({
        flushAt: 1,
        flushInterval: null,
    })

    stub(client, 'flush')

    client.enqueue('type', {})

    t.true(client.flush.calledOnce)
})

test('enqueue - flush after a period of time', async (t) => {
    const client = createClient({ flushInterval: 10 })
    stub(client, 'flush')

    client.enqueue('type', {})

    t.false(client.flush.called)
    await delay(20)

    t.true(client.flush.calledOnce)
})

test("enqueue - don't reset an existing timer", async (t) => {
    const client = createClient({ flushInterval: 10 })
    stub(client, 'flush')

    client.enqueue('type', {})
    await delay(5)
    client.enqueue('type', {})
    await delay(5)

    t.true(client.flush.calledOnce)
})

test('enqueue - skip when client is disabled', async (t) => {
    const client = createClient({ enable: false })
    stub(client, 'flush')

    const callback = spy()
    client.enqueue('type', {}, callback)
    await delay(5)

    t.true(callback.calledOnce)
    t.false(client.flush.called)
})

test("flush - don't fail when queue is empty", async (t) => {
    const client = createClient()

    await t.notThrows(() => client.flush())
})

test('flush - send messages', async (t) => {
    const client = createClient({ flushAt: 2 })

    const callbackA = spy()
    const callbackB = spy()
    const callbackC = spy()

    client.queue = [
        {
            message: 'a',
            callback: callbackA,
        },
        {
            message: 'b',
            callback: callbackB,
        },
        {
            message: 'c',
            callback: callbackC,
        },
    ]

    const data = await client.flush()
    t.deepEqual(Object.keys(data), ['batch'])
    t.deepEqual(data.batch, ['a', 'b'])
    t.true(callbackA.calledOnce)
    t.true(callbackB.calledOnce)
    t.false(callbackC.called)
})

// @todo have to fix this
// test('customer - create object', async (t) => {
//     const client = createClient()
//
//     const object = client.createCustomer({ customer_id: '123', customer_name: 'Jojo' })
//     // console.log(object)
//
//     await t.true()
// })

test('flush - respond with an error', async (t) => {
    const client = createClient()
    const callback = spy()

    client.queue = [
        {
            message: 'error',
            callback,
        },
    ]

    let response;
    await client.flush((data) => {
        response = data.error.message
        t.true(data.error.message === 'error')
    })

    t.true(response === 'error')
})

test('flush - time out if configured', async (t) => {
    const client = createClient({ timeout: 500 })
    const callback = spy()

    client.queue = [
        {
            message: 'timeout',
            callback,
        },
    ]
    await t.throwsAsync(() => client.flush(), { message: 'timeout of 500ms exceeded' })
})

test('flush - skip when client is disabled', async (t) => {
    const client = createClient({ enable: false })
    const callback = spy()

    client.queue = [
        {
            message: 'test',
            callback,
        },
    ]

    await client.flush()

    t.false(callback.called)
})

test('trackEvent --enqueue and flush many messages', async (t) => {
    const client = createClient({ flushAt: 2 })
    stub(client, 'enqueue')

    const message1 = {
        event_name: 'test',
        time_created: new Date(),
        customer_id: '123',
        idempotency_id: '123',
        properties: { test: 'test' },
    }

    client.trackEvent(message1)

    const message2 = {
        event_name: 'test',
        time_created: new Date(),
        customer_id: '123',
        idempotency_id: '12453',
        properties: { test: 'test' },
    }

    stub(client, 'flush')
    t.true(client.enqueue.calledOnce)
    t.false(client.flush.called)
})

test('trackEvent - enqueue a message', (t) => {
    const client = createClient()
    stub(client, 'enqueue')

    const message = {
        idempotency_id: '1',
        event_name: 'event',
        customer_id: '123',
    }
    const apiMessage = {
        idempotency_id: '1',
        properties: { $lib: 'lotus-node' },
        event_name: 'event',
        customer_id: '123',
    }

    client.trackEvent(message, noop)
    console.log(client.queue)

    t.true(client.enqueue.calledOnce)
    t.deepEqual(client.enqueue.firstCall.args, ['trackEvent', apiMessage, noop])
})

test('isErrorRetryable', (t) => {
    const client = createClient()

    t.false(client._isErrorRetryable({}))

    // ETIMEDOUT is retryable as per `is-retry-allowed` (used by axios-retry in `isNetworkError`).
    t.true(client._isErrorRetryable({ code: 'ETIMEDOUT' }))

    // ECONNABORTED is not retryable as per `is-retry-allowed` (used by axios-retry in `isNetworkError`).
    t.false(client._isErrorRetryable({ code: 'ECONNABORTED' }))

    t.true(client._isErrorRetryable({ response: { status: 500 } }))
    t.true(client._isErrorRetryable({ response: { status: 429 } }))

    t.false(client._isErrorRetryable({ response: { status: 200 } }))
})
