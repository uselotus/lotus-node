const type = require('component-type')
const join = require('join-component')
const assert = require('assert')

export const ValidateEventType = {
    trackEvent : "trackEvent",
    customerDetails : "customerDetails",
    createCustomer : "createCustomer",
    createSubscription : "createSubscription",
}

// Lotus messages can be a maximum of 32 kB.
const MAX_SIZE = 32 << 10;

module.exports = eventValidation

/**
 * Validate an event.
 */

function eventValidation(event, type) {
    switch (type) {
        case ValidateEventType.trackEvent:
            validateGenericEvent(event)
            type = type || event.type
            assert(type, 'You must pass an event type.')
            return validateTrackEventEvent(event)
        case ValidateEventType.customerDetails:
            return validateCustomerDetailsEvent(event)
        case ValidateEventType.createCustomer:
            return validateCreateCustomerEvent(event)
        case ValidateEventType.createSubscription:
            return validateCreateSubscriptionEvent(event)
        default:
            assert(0, 'Invalid event type: "' + type + '"')
    }
}

/**
 * Validate a "trackEvent" event.
 */

function validateTrackEventEvent(event) {
    if (!("event_name" in event || "eventName" in event)) {
        throw new Error("event_name is a required key")
    }

    if (!("customer_id" in event || "customerId" in event)) {
        throw new Error("customer_id is a required key")
    }
}

/**
 * Validate a "CustomerDetails" event.
 */

function validateCustomerDetailsEvent(event) {
    if (!("customer_id" in event || "customerId" in event)) {
        throw new Error("customer_id is a required key")
    }
}

/**
 * Validate a "CreateCustomer" event.
 */

function validateCreateCustomerEvent(event) {
    if (!("customer_name" in event || "customerName" in event)) {
        throw new Error("customer_name is a required key")
    }
}

function validateCreateSubscriptionEvent(event) {
    if (!("customer_id" in event || "customerId" in event)) {
        throw new Error("customer_id is a required key")
    }

    if (!("plan_id" in event || "planId" in event)) {
        throw new Error("plan_id is a required key")
    }

    if (!("start_date" in event || "startDate" in event)) {
        throw new Error("start_date is a required key")
    }
}

/**
 * Validation rules.
 */

var genericValidationRules = {
    idempotency_id: 'string',
    properties: 'object',
    customer_id: 'string',
    time_created: 'date',
    event_name: 'string',
}

/**
 * Validate an event object.
 */

function validateGenericEvent(event) {
    assert(type(event) === 'object', 'You must pass a message object.')
    const json = JSON.stringify(event)
    // Strings are variable byte encoded, so json.length is not sufficient.
    assert(Buffer.byteLength(json, 'utf8') < MAX_SIZE, 'Your message must be < 32 kB.')

    for (var key in genericValidationRules) {
        var val = event[key]
        if (!val) continue
        var rule = genericValidationRules[key]
        if (type(rule) !== 'array') {
            rule = [rule]
        }
        var a = rule[0] === 'object' ? 'an' : 'a'
        assert(
            rule.some(function (e) {
                return type(val) === e
            }),
            '"' + key + '" must be ' + a + ' ' + join(rule, 'or') + '.'
        )
    }
}
