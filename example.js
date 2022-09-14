// npm install lotus-node --save
// or
// yarn add lotus-node

import Lotus from 'lotus-node'

const lotus = new Lotus(
    '', // project API key
    {
        host: 'https://www.uselotus.app/', // You can omit this line if using Lotus Cloud
    }
)

// Capture an event
lotus.trackEvent({
    idempotencyId: 'test_event_1',
    eventName: 'test',
    timeCreated: new Date(),
    customerId: '123',
    properties: { test: 'test', numericQuantity: 3.1415 },
})

// console.log("sleeping")
// sleep 5

// Capture an event
lotus.trackEvent({
    idempotencyId: 'test_event_2',
    eventName: 'test',
    timeCreated: new Date(),
    customerId: '123',
    properties: { test: 'test', stringField: 'test' },
})

// On program exit, call shutdown to stop pending pollers and flush any remaining events
client.shutdown()
