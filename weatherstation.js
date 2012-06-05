#!/usr/bin/env node
var bb = require('bonescript');
var fs = require('fs');
var io = require('socket.io');
var bmp085config = require('./weatherstation/bmp085-pressure');
var sht21config = require('./weatherstation/sht21-humidity');

setup = function() {
    try {
        fs.writeFileSync('/sys/class/i2c-adapter/i2c-3/new_device', 'bmp085 0x77', encoding='ascii');
    } catch(ex) {
        console.log('bmp085 driver load failed.');
    }
    try {
        fs.writeFileSync('/sys/class/i2c-adapter/i2c-3/new_device', 'sht21 0x40', encoding='ascii');
    } catch(ex) {
        console.log('sht21 driver load failed.');
    }
    try {
        fs.writeFileSync('/sys/class/i2c-adapter/i2c-3/new_device', 'tsl2550 0x39', encoding='ascii');
    } catch(ex) {
        console.log('tsl2550 driver load failed.');
    }
    var onconnect = function(socket) {
        console.log("New client connected");
        var pdelay = bmp085config.pressureConfig.delay;
        var pscale = bmp085config.pressureConfig.scale;
        var pfileData = bmp085config.pressureConfig.file;

        var preadData = function(fd) {
            fs.readFile(pfileData, function(err, data) {
                if(err) throw("Unable to read data: " + err);
                socket.emit('pressuredata', "" + data / pscale);
            });
            setTimeout(preadData, pdelay);
        };

        var tdelay = bmp085config.tempConfig.delay;
        var tscale = bmp085config.tempConfig.scale;
        var tfileData = bmp085config.tempConfig.file;
        
        var treadData = function(fd) {
            fs.readFile(tfileData, function(err, data) {
                if(err) throw("Unable to read data: " + err);
                socket.emit('tempdata', "" + Math.round((data / tscale)*10)/10);
            });
            setTimeout(treadData, tdelay);
        };

        var hdelay = sht21config.humidityConfig.delay;
        var hscale = sht21config.humidityConfig.scale;
        var hfileData = sht21config.humidityConfig.file;
        
        var hreadData = function(fd) {
            fs.readFile(hfileData, function(err, data) {
                if(err) throw("Unable to read data: " + err);
                socket.emit('humiditydata', "" + data / hscale);
            });
            setTimeout(hreadData, hdelay);
        };

        socket.emit('pressureconfig', bmp085config.pressureConfig);
        socket.emit('tempconfig', bmp085config.tempConfig);
        socket.emit('humidityconfig', sht21config.humidityConfig);
        setTimeout(treadData, tdelay);
        setTimeout(preadData, pdelay);
        setTimeout(hreadData, hdelay);

        // on message
        socket.on('message', function(data) {
            console.log("Got message from client:", data);
        });

        // on disconnect
        socket.on('disconnect', function() {
            console.log("Client disconnected.");
        });
    };
    
    var server = new bb.Server(8000, "weatherstation", onconnect);
    server.name = 'weatherstation';
    server.begin();
};

bb.run();
