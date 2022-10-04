# Lotus Node.js Library

[![MIT License](https://img.shields.io/badge/License-MIT-red.svg?style=flat)](https://opensource.org/licenses/MIT)

Official Lotus Node library to capture and send events to any Lotus instance (self-hosted or cloud).

## Installing

Install the lotus-node package for use in your node.js based backend.

```bash
npm install lotus-node
```

## Initializing

First grab a new api key from the Settings tab. Then change the host to wherever you want to send data to and omit the line if you are using Lotus Cloud.

```jsx
const lotus = new Lotus(api_key, {
    host: 'https://www.uselotus.app/', // You can omit this line if using Lotus Cloud
})
```

## Making calls

Please refer to the [Lotus documentation](https://docs.uselotus.io/docs/intro) for more information on how to use the library.

## Questions?

### [Join our Slack community.](https://lotus-community.slack.com)

## Thank you

This library is largely based on the `posthog-node` package.
