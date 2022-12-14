'use strict'

const { v1: uuidv4 } = require('uuid')
const assert = require('assert')
const removeSlash = require('remove-trailing-slash')
const axios = require('axios')
const axiosRetry = require('axios-retry')
const ms = require('ms')
const looselyValidate = require('./event-validation')

const setImmediate = global.setImmediate || process.nextTick.bind(process)
const noop = () => {}

const ValidateEventType = {
    trackEvent : "trackEvent",
    customerDetails : "customerDetails",
    createCustomer : "createCustomer",
    createSubscription : "createSubscription",
    cancelSubscription : "cancelSubscription",
    changeSubscription : "changeSubscription",
    subscriptionDetails : "subscriptionDetails",
    customerAccess : "customerAccess",
    createCustomersBatch : "createCustomersBatch",
}

const FIVE_MINUTES = 5 * 60 * 1000

const axiosTest = async (req) => {
    try {
        const response = await axios(req)
        return response.data
    } catch (error) {
        throw  new Error(error)
    }

}

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
     * @param {Object} message (Should contain event name and customer id)
     * @param {Function} [callback] (optional)
     * @return {Lotus}
     */
    trackEvent(message, callback) {
        this._validate(message, ValidateEventType.trackEvent)

        const properties = Object.assign({}, message.properties, {
            $lib: 'lotus-node',
        })

        const apiMessage = Object.assign({}, message, { properties })

        this.enqueue('trackEvent', apiMessage, callback)

        return this
    }

    /**
     * Get All Customers.
     *
     * @return {Object} (Array of customers)
     */
    async getCustomers() {
        const headers = {
            'X-API-KEY': this.apiKey,
        }
        const req = {
            method: 'GET',
            url: `${this.host}/api/customers/`,
            headers,
        }

        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }

        return axiosTest(req)
    }

    /**
     * Get Customer Detail.
     *
     * @param {Object} message
     * @return {Object}
     */
    async getCustomerDetail(message) {
        this._validate(message, ValidateEventType.customerDetails)

        message.customer_id = message.customerId || message.customer_id
        delete message.customerId;

        const headers = {
            'X-API-KEY': this.apiKey,
        }
        const req = {
            method: 'GET',
            url: `${this.host}/api/customer_detail/?customer_id=${message.customer_id}`,
            headers,
        }

        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }

        return axiosTest(req)
    }

    /**
     //  * Create a new Customer.
     //  * @param {Object} message
     //  *
     //  */
    async createCustomer(message) {
        this._validate(message, ValidateEventType.createCustomer)

        const data = {
            customer_id: message.customerId || message.customer_id,
            email: message.email,
        }

        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        if(message.customer_name) {
            data["customer_name"] = message.customer_name
        }

        if(message.properties) {
            data["properties"] = message.properties
        }

        if (message.payment_provider) {
            data.payment_provider = message.payment_provider
        }

        if (message.payment_provider_id) {
            data.payment_provider_id = message.payment_provider_id
        }
        const req = {
            method: 'POST',
            url: `${this.host}/api/customers/`,
            data: data,
            headers: headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }

    /**
     * Create a new Subscription.
     *
     * @param {Object} message
     *
     */
    createSubscription(message) {
        this._validate(message, ValidateEventType.createSubscription)
        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        const data = {
            customer_id: message.customer_id || message.customerId,
            plan_id: message.plan_id || message.planId,
            start_date: message.start_date || message.startDate,
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
        return axiosTest(req)
    }

    /**
     * Cancel a Subscription.
     *
     * @param {Object} message
     *
     */
    cancelSubscription(message) {
        this._validate(message, ValidateEventType.cancelSubscription)
        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        const data = {}
        const turn_off_auto_renew = message["turn_off_auto_renew"]
        const replace_immediately_type = message["replace_immediately_type"]

        if (turn_off_auto_renew) {
            data["auto_renew"] = false
        }else {
            data["status"] = "ended"
            data["replace_immediately_type"] = replace_immediately_type
        }

        const req = {
            method: 'PATCH',
            url: `${this.host}/api/subscriptions/${message.subscription_id}/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }

    /**
     * Change a Subscription.
     *
     * @param {Object} message
     *
     */
    changeSubscription(message) {
        this._validate(message, ValidateEventType.changeSubscription)
        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        const turn_off_auto_renew = message["turn_off_auto_renew"]
        const replace_immediately_type = message["replace_immediately_type"]

        const data = {
            "plan_id": message.plan_id,
            "replace_immediately_type": replace_immediately_type,
            "turn_off_auto_renew": turn_off_auto_renew,
        }
        const req = {
            method: 'PATCH',
            url: `${this.host}/api/subscriptions/${message.subscription_id}/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }

    /**
     * Get all subscriptions.
     *
     * @param {Object} message
     *
     */
    async getAllSubscriptions(message) {
        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }
        const req = {
            method: 'GET',
            url: `${this.host}/api/subscriptions/`,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }

    /**
     * Get subscription details. subscription_id
     *
     * @param {Object} message
     *
     */
    async getSubscriptionDetails(message) {
        this._validate(message, ValidateEventType.subscriptionDetails)
        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        message.subscription_id = message.subscriptionId || message.subscription_id
        delete message.subscriptionId;
        const req = {
            method: 'GET',
            url: `${this.host}/api/subscriptions/${message.subscription_id}`,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }

    /**
     * Get All plans.
     *
     * @param {Object} message
     *
     */
    async getAllPlans(message) {
        message = Object.assign({}, message)
        message.library = 'lotus-node'
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        const req = {
            method: 'GET',
            url: `${this.host}/api/plans/`,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }

        return axiosTest(req)
    }

    /**
     * Get customer access.
     *
     * @param {Object} message
     *
     */
    async getCustomerAccess(message) {
        this._validate(message, ValidateEventType.customerAccess)
        message = Object.assign({}, message)
        message.library = 'lotus-node'

        const headers = {
            'X-API-KEY': this.apiKey,
        }

        const params = {
            customer_id: message.customer_id,
            event_limit_type: message.event_limit_type,
        }
        if (message.event_name) {
            params.event_name = message.event_name
        } else if (message.feature_name) {
            params.feature_name = message.feature_name
        }
        const req = {
            method: 'GET',
            url: `${this.host}/api/customer_access/`,
            params,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }


    /**
     * Creater customer batch.
     *
     * @param {Object} message
     *
     */
    async createCustomersBatch(message) {
        this._validate(message, ValidateEventType.createCustomersBatch)
        const headers = {
            'X-API-KEY': this.apiKey,
        }

        const data = {
            customers: message.customers,
            behavior_on_existing: message.behavior_on_existing,
        }

        const req = {
            method: 'POST',
            url: `${this.host}/api/batch_create_customers/`,
            data,
            headers,
        }
        if (this.timeout) {
            req.timeout = typeof this.timeout === 'string' ? ms(this.timeout) : this.timeout
        }
        return axiosTest(req)
    }

    /**
     * Add a `message` of type `type` to the queue and
     * check whether it should be flushed.
     *
     * @param {String} type
     * @param {Object} apiMessage
     * @param {Function} [callback] (optional)
     * @api private
     */
    enqueue(type, apiMessage, callback) {
        callback = callback || noop

        if (!this.enable) {
            return setImmediate(callback)
        }

        const messages = apiMessage.batch  || []

        if(!messages.length) {
             throw  new Error("Messages can't be empty ")
        }

        messages.forEach( message => {
            message = Object.assign({}, message)
            message.type = type
            message.library = 'lotus-node'
            message.time_created = message.timeCreated || message.time_created || new Date() ;
            message.idempotency_id =  message.idempotencyId || message.idempotency_id || uuidv4();
            message.customer_id = message.customerId || message.customer_id
            message.event_name = message.eventName || message.event_name

            delete message.timeCreated;
            delete message.idempotencyId;
            delete message.customerId;
            delete message.eventName;
            this.queue.push({ message, callback })
        })

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

        const headers = {
            'X-API-KEY': this.apiKey,
        }
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
