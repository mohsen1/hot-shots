'use strict';

const assert = require('assert');
const dgram = require('dgram');
const net = require('net');

const createStatsdClient = require('./helpers').createStatsdClient;
const createTCPServer = require('./helpers').createTCPServer;
const createUDPServer = require('./helpers').createUDPServer;

module.exports = function runCheckTestSuite() {
  describe('#check', function () {
    let server;
    let statsd;

    afterEach(function () {
      try {
        server.close();
      }
      catch(err) {
        // ignoring
      }
      server = null;
      statsd = null;
    });

    ['main client', 'child client', 'child of child client'].forEach(function (description, index) {
      describe(description, function () {
        describe('UDP', function () {
          it('should send proper check format for name and status', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|check.name|0');
              done();
            });
          });

          it('should send proper check format for name and status with global prefix and suffix', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                prefix: 'prefix.',
                suffix: '.suffix'
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|prefix.check.name.suffix|0');
              done();
            });
          });

          it('should send proper check format for name, status, and options', function (done) {
            let date = new Date();
            server = createUDPServer(function (address) {
              let options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              options = {
                date_happened: date,
                hostname: 'host',
                message: 'message'
              };
              statsd.check('check.name', statsd.CHECKS.WARNING, options);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|check.name|1|d:' +
                Math.round(date.getTime() / 1000) + '|h:host|m:message'
              );
              done();
            });
          });

          it('should send proper check format for title, text, some options, and tags', function (done) {
            server = createUDPServer(function (address) {
              let options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              options = {
                hostname: 'host'
              };
              statsd.event('test title', 'another desc', options, ['foo', 'bar']);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,12}:test title|another desc|h:host|#foo,bar');
              done();
            });
          });

          it('should send proper check format for title, text, tags, and a callback', function (done) {
            let called = false;
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK, null, ['foo', 'bar'], function () {
                called = true;
              });
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|check.name|0|#foo,bar');
              assert.equal(called, true);
              done();
            });
          });

          it('should send no event stat when a mock Client is used', function (done) {
            let TEST_FINISHED_MESSAGE = 'TEST_FINISHED';
            server = createUDPServer(function (address) {
              statsd = createStatsdClient([
                address.address, address.port, 'prefix', 'suffix', false, false, true
              ], index);

              // Regression test for "undefined is not a function" with missing
              // callback on mock instance
              statsd.check('test', 1);

              statsd.check('test', 1, null, function (error, bytes) {
                let socket = dgram.createSocket("udp4");
                let buf = new Buffer(TEST_FINISHED_MESSAGE);

                assert.ok(!error);
                assert.equal(bytes, 0);
                // We should call finished() here, but we have to work around
                // https://github.com/joyent/node/issues/2867 on node 0.6,
                // such that we don't close the socket within the `listening` event
                // and pass a single message through instead.
                socket.send(buf, 0, buf.length, address.port, address.address, function () {
                  socket.close();
                });
              });
            });
            server.on('metrics', function (message) {
              // We only expect to get our own test finished message, no stats
              assert.equal(message, TEST_FINISHED_MESSAGE);
              done();
            });
          });

          it('should throw an exception when using telegraf format', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
              }, index);
              assert.throws(function () {
                statsd.check('check.name', statsd.CHECKS.OK, null, ['foo', 'bar']);
              }, function (err) {
                done();
              });
            });
          });

          it('should use errorHandler', function (done) {
            server = createUDPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
                errorHandler: function () {
                  done();
                }
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK);
            });
          });
        });

        describe('TCP', function () {
          it('should send proper check format for name and status', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|check.name|0\n');
              done();
            });
          });

          it('should send proper check format for name and status with global prefix and suffix', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                prefix: 'prefix.',
                suffix: '.suffix',
                protocol: 'tcp'
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|prefix.check.name.suffix|0\n');
              done();
            });
          });

          it('should send proper check format for name, status, and options', function (done) {
            let date = new Date();
            server = createTCPServer(function (address) {
              let options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              options = {
                date_happened: date,
                hostname: 'host',
                message: 'message'
              };
              statsd.check('check.name', statsd.CHECKS.WARNING, options);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|check.name|1|d:' +
                Math.round(date.getTime() / 1000) + '|h:host|m:message\n'
              );
              done();
            });
          });

          it('should send proper check format for title, text, some options, and tags', function (done) {
            server = createTCPServer(function (address) {
              let options;
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              options = {
                hostname: 'host'
              };
              statsd.event('test title', 'another desc', options, ['foo', 'bar']);
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_e{10,12}:test title|another desc|h:host|#foo,bar\n');
              done();
            });
          });

          it('should send proper check format for title, text, tags, and a callback', function (done) {
            let called = false;
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                protocol: 'tcp'
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK, null, ['foo', 'bar'], function () {
                called = true;
              });
            });
            server.on('metrics', function (event) {
              assert.equal(event, '_sc|check.name|0|#foo,bar\n');
              assert.equal(called, true);
              done();
            });
          });

          it('should send no event stat when a mock Client is used', function (done) {
            let TEST_FINISHED_MESSAGE = 'TEST_FINISHED';
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                prefix: 'prefix',
                suffix: 'suffix',
                mock: true,
                protocol: 'tcp'
              }, index);

              // Regression test for "undefined is not a function" with missing
              // callback on mock instance
              statsd.check('test', 1);

              statsd.check('test', 1, null, function (error, bytes) {
                let socket = net.connect(address.port, address.address);
                let buf = new Buffer(TEST_FINISHED_MESSAGE);

                assert.ok(!error);
                assert.equal(bytes, 0);
                // We should call finished() here, but we have to work around
                // https://github.com/joyent/node/issues/2867 on node 0.6,
                // such that we don't close the socket within the `listening` event
                // and pass a single message through instead.
                socket.write(buf, 0, 'ascii', function () {
                  socket.close();
                });
              });
            });
            server.on('metrics', function (message) {
              // We only expect to get our own test finished message, no stats
              assert.equal(message, TEST_FINISHED_MESSAGE);
              done();
            });
          });

          it('should throw an exception when using telegraf format', function (done) {
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
                protocol: 'tcp'
              }, index);
              assert.throws(function () {
                statsd.check('check.name', statsd.CHECKS.OK, null, ['foo', 'bar']);
              }, function (err) {
                // need to set server to null early or have an errorHandler for the
                // async TCP error on close
                server = null;
                done();
              });
            });
          });

          it('should use errorHandler', function (done) {
            let calledDone = false;
            server = createTCPServer(function (address) {
              statsd = createStatsdClient({
                host: address.address,
                port: address.port,
                telegraf: true,
                protocol: 'tcp',
                errorHandler: function () {
                  if (! calledDone) {
                    calledDone = true;
                    done();
                  }
                }
              }, index);
              statsd.check('check.name', statsd.CHECKS.OK);
            });
          });
        });
      });
    });
  });
};
