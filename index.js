'use strict'

const assert = require('assert')
const removeSlash = require('remove-trailing-slash')
const axios = require('axios')
const axiosRetry = require('axios-retry')
const ms = require('ms')
const looselyValidate = require('./event-validation')
const customerValidate = require('./customer-validation')

const setImmediate = global.setImmediate || process.nextTick.bind(process)
const noop = () => {}

const FIVE_MINUTES = 5 * 60 * 1000
class Lotus {
    /**
     * Initialize a new `Lotus` with your Lotus organization's `apiKey` and an
     * optional dictionary of `options`.
     *
     * @param {String} apiKey
     * @param {Object} [options] (optional)
     *   @property {Number} flushAt (default: 20)
     *   @property {Number} flushInterval (default: 10000)
     *   @property {String} host (default: 'https://www.uselotus.app/')
     *   @property {Boolean} enable (default: true)
     */

    constructor(apiKey, options) {
        options = options || {}

        assert(apiKey, "You must pass your Lotus organization's api key.")

        this.queue = []
        this.apiKey = apiKey
        this.host = removeSlash(options.host || 'https://www.uselotus.app/')
        this.timeout = options.timeout || false
        this.flushAt = Math.max(options.flushAt, 1) || 20
        this.flushInterval = typeof options.flushInterval === 'number' ? options.flushInterval : 10000
        this.flushed = false

        Object.defineProperty(this, 'enable', {
            configurable: false,
            writable: false,
            enumerable: true,
            value: typeof options.enable === 'boolean' ? options.enable : true,
        })

        axiosRetry(axios, {
            retries: options.retryCount || 3,
            retryCondition: this._isErrorRetryable,
            retryDelay: axiosRetry.exponentialDelay,
        })
    }

    _validate(message, type) {
        try {
            looselyValidate(message, type)
        } catch (e) {
            if (e.message === 'Your message must be < 32 kB.') {
                console.log('Your message must be < 32 kB.', JSON.stringify(message))
                return
            }
            throw e
        }
    }

    /**
     * Create a new Customer or update an existing Customer.
     * @param {Object} message
     * @param {String} message.customerId
     *
     */
    customer(messsage, callback) {
        customerValidate(messsage, 'customer')

        const req = {
            method: 'POST',
            url: `${this.host}/api/customers/`,
            data,
            headers,
        }

        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }

        axios(req)
            .then(() => done())
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    return done(error)
                }

                done(err)
            })
    }

    /**
     * Send a trackEvent `message`.
     *
     * @param {Object} message
     * @param {Function} [callback] (optional)
     * @return {Lotus}
     */

    trackEvent(message, callback) {
        this._validate(message, 'trackEvent')

        const properties = Object.assign({}, message.properties, {
            $lib: 'lotus-node',
        })

        const apiMessage = Object.assign({}, message, { properties })
        console.log(323)

        this.enqueue('trackEvent', apiMessage, callback)

        return this
    }

    /**
     * Add a `message` of type `type` to the queue and
     * check whether it should be flushed.
     *
     * @param {String} type
     * @param {Object} message
     * @param {Function} [callback] (optional)
     * @api private
     */

    enqueue(type, message, callback) {
        callback = callback || noop

        if (!this.enable) {
            return setImmediate(callback)
        }

        message = Object.assign({}, message)
        message.type = type
        message.library = 'lotus-node'

        if (!message.timestamp) {
            message.timestamp = new Date()
        } else {
            message.timestamp = message.timestamp
        }

        if (message.idempotencyId) {
            message.idempotency_id = message.idempotencyId
            delete message.idempotencyId
        }

        if (message.customerId) {
            message.customer = message.customerId
            delete message.customerId
        }

        if (message.eventName) {
            message.event_name = message.eventName
            delete message.eventName
        }
        this.queue.push({ message, callback })

        if (!this.flushed) {
            this.flushed = true
            this.flush()
            return
        }

        if (this.queue.length >= this.flushAt) {
            this.flush()
        }

        if (this.flushInterval && !this.timer) {
            this.timer = setTimeout(() => this.flush(), this.flushInterval)
        }
    }

    /**
     * Flush the current queue
     *
     * @param {Function} [callback] (optional)
     * @return {Lotus}
     */

    flush(callback) {
        callback = callback || noop

        if (!this.enable) {
            return setImmediate(callback)
        }

        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }

        if (!this.queue.length) {
            return setImmediate(callback)
        }

        const items = this.queue.splice(0, this.flushAt)
        const callbacks = items.map((item) => item.callback)
        const messages = items.map((item) => item.message)

        const data = {
            batch: messages,
        }

        const done = (err) => {
            callbacks.forEach((callback) => callback(err))
            callback(err, data)
        }

        const headers = { 'X-API-KEY': this.apiKey }
        if (typeof window === 'undefined') {
            headers['user-agent'] = `lotus-node`
        }

        const req = {
            method: 'POST',
            url: `${this.host}/api/track/`,
            data,
            headers,
        }

        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }

        axios(req)
            .then(() => done())
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    return done(error)
                }

                done(err)
            })
    }

    shutdown() {
        this.flush()
    }

    _isErrorRetryable(error) {
        // Retry Network Errors.
        if (axiosRetry.isNetworkError(error)) {
            return true
        }

        if (!error.response) {
            // Cannot determine if the request can be retried
            return false
        }

        // Retry Server Errors (5xx).
        if (error.response.status >= 500 && error.response.status <= 599) {
            return true
        }

        // Retry if rate limited.
        if (error.response.status === 429) {
            return true
        }

        return false
    }
}

module.exports = Lotus
