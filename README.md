[![Build Status](https://travis-ci.com/QuickSander/homebridge-http-ambient-light-sensor.svg?branch=master)](https://travis-ci.com/QuickSander/homebridge-http-ambient-light-sensor)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/homebridge-http-ambient-light-sensor.svg)](https://badge.fury.io/js/homebridge-http-ambient-light-sensor)

# homebridge-http-ambient-light-sensor

This [Homebridge](https://github.com/nfarina/homebridge) plugin can be used integrate your ambient light sensor which has a HTTP api into HomeKit. This sensor supports push notification without the need for HomeBridge to periodically pull the sensor value.

_This is a fork of Supereg's [homebridge-http-temperature-sensor](https://github.com/Supereg/homebridge-http-temperature-sensor) modified to function as an ambient light level sensor._

### Changes in this fork with respect to original
* Added min/max value configuration parameters
* Minor refactoring (pull make/model from ```package.json```)


## Installation

First of all you need to have [Homebridge](https://github.com/nfarina/homebridge) installed. Refer to the repo for
instructions.  
Then run the following command to install `homebridge-http-ambient-light-sensor`

```
sudo npm install -g homebridge-http-ambient-light-sensor
```

## Updating the ambient light level in HomeKit

The _'CurrentAmbientLightLevel'_ characteristic from the _'LightSensor'_ service has the permission to `notify` the
HomeKit controller of state changes.
`homebridge-http-ambient-light-sensor` supports two ways to send ambient light level changes to HomeKit.

#### The 'pull' way:

The 'pull' way is probably the easiest to set up and supported in every scenario. `homebridge-http-ambient-light-sensor`
requests the value of the sensor in an specified interval (pulling) and sends the value to HomeKit.  
Look for `pullInterval` in the list of configuration options if you want to configure it.

#### The 'push' way:

When using the 'push' concept the http device itself sends the updated value itself to `homebridge-http-ambient-light-sensor`
whenever the value changes. This is more efficient as the new value is updated instantly and
`homebridge-http-ambient-light-sensor` does not need to make needless requests when the value didn't actually change.
However because the http device needs to actively notify the `homebridge-http-ambient-light-sensor` plugin there is more
work needed to implement this method into your http device.  
How to implement the protocol into your http device can be read in the chapter [**Notification Server**](#notification-server)

## Configuration

The configuration can contain the following properties:
* `name` \<string\> **required**: Defines the name which is later displayed in HomeKit
* `getUrl` \<string |  [urlObject](#urlobject)\> **required**: Defines the url
(and other properties when using an urlObject) to query the current value from the sensor.
It currently expects the http server to return a float ranging from 0-100 (step 0.1) leaving out any html markup.
* `identifyUrl` \<string |  [urlObject](#urlobject)\> **optional**: URL to call when the HomeKit identify action is requested.
* `pullInterval` \<integer\> **optional**: The property expects an interval in **milliseconds** in which the plugin
pulls updates from your http device. For more information read [pulling updates](#the-pull-way).  
* `maxValue` \<float\> **optional**: Maximum lux value the sensor can return. Defaults to BH1750 light sensor module value: 2^16 -1 = 65535.
* `minValue` \<float\> **optional**: Minimum lux value the sensor can return. Default to 0.0.

Below are two example configurations. One is using a simple string url and the other is using a simple urlObject.  
Both configs can be used for a basic plugin configuration.
```json
{
    "accessories": [
        {
          "accessory": "HttpAmbientLightSensor",
          "name": "Outdoor Light Sensor",

          "getUrl": "http://localhost/api/lux"
        }   
    ]
}
```
```json
{
    "accessories": [
        {
          "accessory": "HttpAmbientLightSensor",
          "name": "Outdoor Light Sensor",

          "getUrl": {
            "url": "http://localhost/api/lux",
            "method": "GET"
          }
        }   
    ]
}
```

Specifying a custom min and max value for an 8 bit sensor:

```json
{
    "accessories": [
        {
          "accessory": "HttpAmbientLightSensor",
          "name": "Outdoor Light Sensor",

          "getUrl": "http://localhost/api/lux",

          "minValue": 1.0,
          "maxValue": 255.0
        }   
    ]
}
```

#### UrlObject

A urlObject can have the following properties:
* `url` \<string\> **required**: Defines the url pointing to your http server
* `method` \<string\> **optional** \(Default: **"GET"**\): Defines the http method used to make the http request
* `body` \<string\> **optional**: Defines the body sent with the http request
* `auth` \<object\> **optional**: If your http server uses basic authentication you can specify your credential in this
object. When defined the object must contain the following properties:
    * `username` \<string\>
    * `password` \<string\>
* `headers` \<object\> **optional**: Using this object you can define any http headers which are sent with the http
request. The object must contain only string key value pairs.  

Below is an example of an urlObject containing all properties:
```json
{
  "url": "http://example.com:8080",
  "method": "GET",
  "body": "exampleBody",

  "auth": {
    "username": "yourUsername",
    "password": "yourPassword"
  },

  "headers": {
    "Content-Type": "text/html"
  }
}
```

## Notification Server

`homebridge-http-ambient-light-sensor` can be used together with
[homebridge-http-notification-server](https://github.com/Supereg/homebridge-http-notification-server) in order to receive
updates when the state changes at your external program. For details on how to implement those updates and how to
install and configure `homebridge-http-notification-server`, please refer to the
[README](https://github.com/Supereg/homebridge-http-notification-server) of the repository.

Down here is an example on how to configure `homebridge-http-ambient-light-sensor` to work with your implementation of the
`homebridge-http-notification-server`.

```json
{
    "accessories": [
        {
          "accessory": "HttpAmbientLightSensor",
          "name": "Outdoor Light Sensor",

          "notificationID": "my-light-sensor",
          "notificationPassword": "superSecretPassword",

          "getUrl": "http://localhost/api/lux"
        }   
    ]
}
```

* `notificationID` is an per Homebridge instance unique id which must be included in any http request.  
* `notificationPassword` is **optional**. It can be used to secure any incoming requests.

To get more details about the configuration have a look at the
[README](https://github.com/Supereg/homebridge-http-notification-server).

**Available characteristics (for the POST body)**

Down here are all characteristics listed which can be updated with an request to the `homebridge-http-notification-server`

* `characteristic` "CurrentAmbientLightLevel": expects an float `value` in a range of 0.0 up to and including 65535.
