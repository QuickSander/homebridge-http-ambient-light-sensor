// ISC License
// Original work Copyright (c) 2017, Andreas Bauer
// Modified work Copyright 2018, Sander van Woensel

"use strict";

// -----------------------------------------------------------------------------
// Module variables
// -----------------------------------------------------------------------------
let Service, Characteristic, api;

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const configParser = require("homebridge-http-base").configParser;
const http = require("homebridge-http-base").http;
const PullTimer = require("homebridge-http-base").PullTimer;

const PACKAGE_JSON = require('./package.json');
const MANUFACTURER = PACKAGE_JSON.author.name;
const SERIAL_NUMBER = '001';
const MODEL = PACKAGE_JSON.name;
const FIRMWARE_REVISION = PACKAGE_JSON.version;

const MIN_LUX_VALUE = 0.0;
const MAX_LUX_VALUE =  Math.pow(2, 16) - 1.0; // Default BH1750 max 16bit lux value.

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    api = homebridge;

    homebridge.registerAccessory(MODEL, "HttpAmbientLightSensor", HttpAmbientLightSensor);
};

// -----------------------------------------------------------------------------
// Module public functions
// -----------------------------------------------------------------------------

function HttpAmbientLightSensor(log, config) {
    this.log = log;
    this.name = config.name;
    this.minSensorValue = config.minValue || MIN_LUX_VALUE;
    this.maxSensorValue = config.maxValue || MAX_LUX_VALUE;

    if (config.getUrl) {
        try {
            this.getUrl = configParser.parseUrlProperty(config.getUrl);
        } catch (error) {
            this.log.error("Error occurred while parsing 'getUrl': " + error.message);
            this.log.error("Aborting...");
            return;
        }
    }
    else {
        this.log.error("Property 'getUrl' is required!");
        this.log.error("Aborting...");
        return;
    }


    if(config.identifyUrl) {
        try {
            this.identifyUrl = configParser.parseUrlProperty(config.identifyUrl);
        } catch (error) {
            this.log.error("Error occurred while parsing 'identifyUrl': " + error.message);
            this.log.error("Aborting...");
            return;
        }
    }

    this.homebridgeService = new Service.LightSensor(this.name);
    this.homebridgeService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
        .setProps({
                    minValue: this.minSensorValue,
                    maxValue: this.maxSensorValue
                })
        .on("get", this.getSensorValue.bind(this));

    if (config.pullInterval) {
        this.pullTimer = new PullTimer(log, config.pullInterval, this.getSensorValue.bind(this), value => {
            this.homebridgeService.setCharacteristic(Characteristic.CurrentAmbientLightLevel, value);
        });
        this.pullTimer.start();
    }

    // Register notification server.
    api.on('didFinishLaunching', function() {
        // Check if notificationRegistration is set and user specified notificationID.
        // if not 'notificationRegistration' is probably not installed on the system.
        if (global.notificationRegistration && typeof global.notificationRegistration === "function" &&
            config.notificationID) {
            try {
            global.notificationRegistration(config.notificationID, this.handleNotification.bind(this), config.notificationPassword);

            } catch (error) {
                // notificationID is already taken.
            }
        }
    }.bind(this));

}

HttpAmbientLightSensor.prototype = {

    identify: function (callback) {
      this.log.info("Identify requested");

      if (this.identifyUrl) {
         http.httpRequest(this.identifyUrl, (error, response, body) => {

             if (error) {
                this.log.error("identify() failed: %s", error.message);
                callback(error);
             }
             else if (response.statusCode !== 200) {
                this.log.error("identify() returned http error: %s", response.statusCode);
                callback(new Error("Got http error code " + response.statusCode));
             }
             else {
                callback(null);
             }
         });
      }
      else {
         callback(null);
      }

    },

    getServices: function () {
        const informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, MANUFACTURER)
            .setCharacteristic(Characteristic.Model, MODEL)
            .setCharacteristic(Characteristic.SerialNumber, SERIAL_NUMBER)
            .setCharacteristic(Characteristic.FirmwareRevision, FIRMWARE_REVISION);

        return [informationService, this.homebridgeService];
    },

    handleNotification: function(body) {
        const value = body.value;

        let characteristic;
        switch (body.characteristic) {
            case "CurrentAmbientLightLevel":
                characteristic = Characteristic.CurrentAmbientLightLevel;
                break;
            default:
                this.log.warn("Encountered unknown characteristic handling notification: " + body.characteristic);
                return;
        }
        this.log.debug("Update received from device: " + body.characteristic + ": " + body.value);

        this.homebridgeService.setCharacteristic(characteristic, value);
    },

    getSensorValue: function (callback) {
        http.httpRequest(this.getUrl, (error, response, body) => {
            if (this.pullTimer)
                this.pullTimer.resetTimer();

            if (error) {
                this.log.error("getSensorValue() failed: %s", error.message);
                callback(error);
            }
            else if (response.statusCode !== 200) {
                this.log.error("getSensorValue() returned http error: %s", response.statusCode);
                callback(new Error("Got http error code " + response.statusCode));
            }
            else {
                const sensorValue = parseFloat(body);
                this.log.info("Get sensor value: %s", sensorValue);

                callback(null, sensorValue);
            }
        });
    },

};
