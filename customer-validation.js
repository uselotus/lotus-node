var type = require('component-type')
var join = require('join-component')
var assert = require('assert')

// Lotus messages can be a maximum of 32 kB.
var MAX_SIZE = 32 << 10

module.exports = customerValidation

/**
 * Validate a customer.
 */

function customerValidation(customer, type) {
    validateGenericCustomer(customer)
    type = type || customer.type
    assert(type, 'You must pass a customer type.')
}

/**
 * Validation rules.
 */

var genericValidationRules = {
    customerId: 'string',
    properties: 'object',
    customerId: 'string',
    timestamp: 'date',
    eventName: 'string',
}

/**
 * Validate an event object.
 */

function validateGenericEvent(event) {
    assert(type(event) === 'object', 'You must pass a message object.')
    var json = JSON.stringify(event)
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
