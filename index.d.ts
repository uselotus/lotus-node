// Type definitions for lotus-node
// Project: Lotus

declare module 'lotus-node' {
    interface Option {
        flushAt?: number
        flushInterval?: number
        host?: string
        enable?: boolean
    }
    interface EventMessage {
        idempotencyId: string
        customerId: string
        eventName: string
        timeCreated: day.js
        properties?: Record<string | number, any>
    }

    export default class Lotus {
        constructor(apiKey: string, options?: Option)
        /**
         * @description Track event allows you to send any billable events to Lotus. From there, 
         * you can use the data along with the UI to flexibly bill your customers.
         * An event call requires:
         * @param idempotencyId which uniquely identifies the event. This is used to prevent 
         * duplicate events from being sent.
         * @param customerId which uniquely identifies the customer. This is used to associate the
         * event with the customer.
         * @param eventName We recommend using [verb] [noun], like email sent or schema created to
         * easily identify what your events mean later on.
         * @param timeCreated the time the event occurred. This is used to determine when to bill 
         * the customer. You are responsible for telling us when it happened, since its progress 
         * through our data pipeliens might not match up with your billing periods.
         * @param properties OPTIONAL | an object with any information you'd like to add
         */
        trackEvent({ idempotencyId, customerId, eventName, timeCreated, properties }: EventMessage): void

        /**
         * @description Flushes the events still in the queue to allow for a clean shutdown.
        */
        shutdown(): void
    }

}
