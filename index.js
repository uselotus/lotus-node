'use strict'

const { v1: uuidv4 } = require('uuid')
const assert = require('assert')
const removeSlash = require('remove-trailing-slash')
const axios = require('axios')
const axiosRetry = require('axios-retry')
const ms = require('ms')
const looselyValidate = require('./event-validation')
// const customerValidation = require('./customer-validation')

const setImmediate = global.setImmediate || process.nextTick.bind(process)
const noop = () => { }

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

        this.enqueue('trackEvent', apiMessage, callback)

        return this
    }

    /**
     * Get customer access. 
     *
     * @param {Object} message
     *
     */
    getCustomers(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const req = {
            method: 'GET',
            url: `${this.host}/api/customers/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
    //  * Create a new Customer or update an existing Customer.
    //  * @param {Object} message
    //  *
    //  */
    createCustomer(message, callback) {
        // customerValidate(messsage, 'customer')

        message = Object.assign({}, message)
        message.library = 'lotus-node'

        const headers = { 'X-API-KEY': this.apiKey }
        if (typeof window === 'undefined') {
            headers['user-agent'] = `lotus-node`
        }
        if (message.library) {
            delete message.library
        }

        const data = {
            name: message.name,
            customer_id: message.customer_id,
        }
        if (message.balance) {
            data.balance = message.balance
        }
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
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
 * Get customer access. 
 *
 * @param {Object} message
 *
 */
    getCurrentUsage(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const data = {
            customer_id: message.customer_id,
        }
        const req = {
            method: 'GET',
            url: `${this.host}/api/draft_invoice/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
     * Get customer access. 
     *
     * @param {Object} message
     *
     */
    getPlans(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const req = {
            method: 'GET',
            url: `${this.host}/api/plans/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
 * Get customer access. 
 *
 * @param {Object} message
 *
 */
    getSubscriptions(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const req = {
            method: 'GET',
            url: `${this.host}/api/subscriptions/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
     * Create a new Subscription.
     *
     * @param {Object} message
     *
     */
    createSubscription(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const data = {
            customer_id: message.customer_id,
            billing_plan_id: message.billing_plan_id,
            start_date: message.start_date,
        }
        if (message.end_date) {
            data.end_date = message.end_date
        }
        if (message.status) {
            data.status = message.status
        }
        if (message.auto_renew) {
            data.auto_renew = message.auto_renew
        }
        if (message.is_new) {
            data.is_new = message.is_new
        }
        if (message.subscription_id) {
            data.subscription_id = message.subscription_id
        }

        const req = {
            method: 'POST',
            url: `${this.host}/api/subscriptions/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
     * Create a new Subscription.
     *
     * @param {Object} message
     *
     */
    cancelSubscription(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const data = {
            subscription_id: message.subscription_id,
            bill_now: message.bill_now,
            revoke_access: message.revoke_access,
        }
        const req = {
            method: 'POST',
            url: `${this.host}/api/cancel_subscription/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
    }

    /**
     * Get customer access. 
     *
     * @param {Object} message
     *
     */
    getCustomerAccess(message, callback) {
        // this._validate(message, 'subscription')
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        if (message.library) {
            delete message.library
        }

        const data = {
            customer_id: message.customer_id,
        }
        if (message.event_name) {
            data.event_name = message.event_name
            data.event_limit_type = message.event_limit_type
        }
        else if (message.feature_name) {
            data.feature_name = message.feature_name
        }
        const req = {
            method: 'GET',
            url: `${this.host}/api/customer_access/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        axios(req)
            .then(() => { })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    console.log(error)
                }
            })
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

        if (message.timestamp === undefined) {
            message.time_created = new Date()
        } else {
            message.time_created = message.timestamp
        }

        if (message.idempotencyId) {
            message.idempotency_id = message.idempotencyId
            delete message.idempotencyId
        } else if (message.idempotency_id === undefined) {
            message.idempotency_id = uuidv4()
        }

        if (message.customerId) {
            message.customer_id = message.customerId
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
            .then((res) => {
                done()
            })
            .catch((err) => {
                if (err.response) {
                    const error = new Error(err.response.statusText)
                    return done(err.response.data)
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
