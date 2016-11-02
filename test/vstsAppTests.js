const fs = require('fs');
const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire');

const BUILD_API_VERSION = '2.0';
const PROJECT_API_VERSION = '1.0';
const RELEASE_API_VERSION = '3.0-preview.1';
const DISTRIBUTED_TASK_API_VERSION = '3.0-preview.1';
const SERVICE_ENDPOINTS_API_VERSION = '3.0-preview.1';

describe('app', function () {
   'use strict';

   it('run should run without error', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      var fsStub = this.stub(fs, 'readFileSync');
      fsStub.onCall(0).returns('{"name": "{{BuildDefName}}"}');
      fsStub.onCall(1).returns('{"name": "{{ReleaseDefName}}"}');

      var args = {
         vsts: 'mydemos',
         pat: 'token',
         project: 'e2eDemo',
         appName: 'e2eDemo',
         queue: 'Default',
         azureSub: 'AzureSub',
         target: 'paas',
         releaseJson: 'releaseJson'
      };

      // findOrCreateProject
      // return so the code thinks the project was found
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.visualstudio.com/DefaultCollection/_apis/projects/e2eDemo`,
         qs: { 'api-version': '1.0' }
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ name: 'e2eDemo', id: 1 }));

      // findQueue
      // return so the queue is found
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': `Basic OnRva2Vu` },
         url: `https://mydemos.visualstudio.com/DefaultCollection/1/_apis/distributedtask/queues`,
         qs: { 'api-version': '3.0-preview.1', 'queueName': 'Default' }
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ id: 420 }, { id: 311 }] }));

      // findAzureSub
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.visualstudio.com/_apis/distributedtask/serviceendpointproxy/azurermsubscriptions`
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ displayName: 'NotMySub' }, { displayName: 'AzureSub' }] }));

      // findOrCreateDockerServiceEndpoint
      // Nothing to do targeting PaaS

      // findOrCreateBuild
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.visualstudio.com/DefaultCollection/1/_apis/build/definitions`,
         qs: { 'api-version': '2.0' }
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'e2edemo-Docker-CI' }, { name: 'notme', authoredBy: { id: 352, displayName: 'Test User', uniqueName: 'Test@User' } }] }));

      // createBuild
      requestStub.withArgs({
         method: 'POST',
         headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': 'Basic OnRva2Vu' },
         json: true,
         url: `https://mydemos.visualstudio.com/DefaultCollection/1/_apis/build/definitions`,
         qs: { 'api-version': '2.0' },
         body: { "name": "e2eDemo-CI" },
      }, sinon.match.any).yields(null, { statusCode: 200 }, { name: 'e2eDemo-CI', authoredBy: { id: 352, displayName: 'Test User', uniqueName: 'Test@User' } });

      // findOrCreateAzureServiceEndpoint
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.visualstudio.com/1/_apis/distributedtask/serviceendpoints`,
         qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION }
      }, sinon.match.any).yields(null, null, JSON.stringify({ value: [{ data: { subscriptionName: 'AzureSub' } }] }));

      // findOrCreateRelease
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.vsrm.visualstudio.com/DefaultCollection/1/_apis/release/definitions`,
         qs: { 'api-version': '3.0-preview.1' }
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'notme' }] }));

      // createRelease
      requestStub.withArgs({
         method: 'POST',
         headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': 'Basic OnRva2Vu' },
         json: true,
         url: `https://mydemos.vsrm.visualstudio.com/DefaultCollection/1/_apis/release/definitions`,
         qs: { 'api-version': '3.0-preview.1' },
         body: { "name": "e2eDemo-CD" }
      }, sinon.match.any).yields(null, { statusCode: 200 }, { name: 'e2eDemo-CD' });

      // Act
      proxyApp.run(args, logger, function (err, data) {
         assert.ok(!err);
         done();
      });

      // Assert
   }));

   it('run should fail to find Azure Sub', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };
      logger.log.error = function () { };

      logger.env = function () { };
      logger.env.error = function () { };

      var fsStub = this.stub(fs, 'readFileSync');
      fsStub.onCall(0).returns('{"name": "{{BuildDefName}}"}');
      fsStub.onCall(1).returns('{"name": "{{ReleaseDefName}}"}');

      var args = {
         vsts: 'mydemos',
         pat: 'token',
         project: 'e2eDemo',
         appName: 'e2eDemo',
         queue: 'Default',
         azureSub: 'AzureSub',
         target: 'paas',
         releaseJson: 'releaseJson'
      };

      // findOrCreateProject
      // return so the code thinks the project was found
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.visualstudio.com/DefaultCollection/_apis/projects/e2eDemo`,
         qs: { 'api-version': '1.0' }
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ name: 'e2eDemo', id: 1 }));

      // findQueue
      // return so the queue is found
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'authorization': `Basic OnRva2Vu` },
         url: `https://mydemos.visualstudio.com/DefaultCollection/1/_apis/distributedtask/queues`,
         qs: { 'api-version': '3.0-preview.1', 'queueName': 'Default' }
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ id: 420 }, { id: 311 }] }));

      // findAzureSub
      // Return an empty array
      requestStub.withArgs({
         method: 'GET',
         headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': 'Basic OnRva2Vu' },
         url: `https://mydemos.visualstudio.com/_apis/distributedtask/serviceendpointproxy/azurermsubscriptions`
      }, sinon.match.any).yields(null, { statusCode: 200 }, JSON.stringify({ value: [] }));

      // Act
      proxyApp.run(args, logger, function (err, data) {
         assert.ok(err);
         done();
      });

      // Assert
   }));

   it('run should return error', function (done) {
      // Arrange
      const proxyApp = proxyquire('../generators/vsts/app.js', {
         'request': function (options, callback) {
            callback(new Error("boom"), null, null);
         }
      });

      var logger = sinon.stub();
      logger.log = function () { };

      var args = {
         vsts: 'mydemos',
         pat: 'token',
         project: 'e2eDemo',
         appName: 'e2eDemo',
         queue: 'Default',
         azureSub: 'AzureSub',
         target: 'paas',
         releaseJson: 'releaseJson'
      };

      // Act
      // I have to use an anonymous function otherwise
      // I would be passing the return value of findOrCreateProject
      // instead of the function. I have to do this to pass args
      // to findOrCreateProject.

      // I use the custom error validation method to call done
      // because my method is async 
      assert.throws(() => {
         proxyApp.run(args, logger);
      }, function (err) {
         done();
         return true;
      });
   });

   it('findQueue should find queue', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      const proxyApp = proxyquire('../generators/vsts/app.js', {
         'request': function (options, callback) {
            // Confirm the request was formatted correctly
            assert.equal('GET', options.method, 'wrong method');
            assert.equal('Basic token', options.headers.authorization, 'wrong authorization');
            assert.equal('https://mydemos.visualstudio.com/DefaultCollection/1/_apis/distributedtask/queues', options.url, 'wrong url');

            // Respond
            callback(null, { statusCode: 200 }, JSON.stringify({ value: [{ id: 420 }, { id: 311 }] }));
         }
      });

      var logger = this.stub();
      logger.log = function () { };

      // Act
      proxyApp.findQueue(
         'Hosted',
         'mydemos',
         { id: 1 },
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal(420, data);

            done();
         });
   }));

   it('findQueue should returns error obj from server', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      const proxyApp = proxyquire('../generators/vsts/app.js', {
         'request': function (options, callback) {
            callback(null, { statusCode: 302 }, JSON.stringify("{ error: 'some error' }"));
         }
      });

      var logger = this.stub();
      logger.log = function () { };

      // Act
      proxyApp.findQueue(
         'Hosted',
         'mydemos',
         { id: 1 },
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.ok(err);

            done();
         });
   }));

   it('findQueue should returns error', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      const proxyApp = proxyquire('../generators/vsts/app.js', {
         'request': function (options, callback) {
            callback(null, { statusCode: 400 }, null);
         }
      });

      var logger = this.stub();
      logger.log = function () { };

      // Act
      proxyApp.findQueue(
         'Hosted',
         'mydemos',
         { id: 1 },
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.ok(err instanceof Error);

            done();
         });
   }));

   it('findAzureSub should find sub', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      const proxyApp = proxyquire('../generators/vsts/app.js', {
         'request': function (options, callback) {
            // Confirm the request was formatted correctly
            assert.equal('GET', options.method, 'wrong method');
            assert.equal('https://mydemos.visualstudio.com/_apis/distributedtask/serviceendpointproxy/azurermsubscriptions', options.url, 'wrong url');

            // Respond
            callback(null, { statusCode: 200 }, JSON.stringify({ value: [{ displayName: 'NotMySub' }, { displayName: 'AzureSub' }] }));
         }
      });

      var logger = this.stub();
      logger.log = function () { };

      // Act
      proxyApp.findAzureSub(
         'mydemos',
         'AzureSub',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('AzureSub', data.displayName);

            done();
         });
   }));

   it('findOrCreateBuild should find build', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      // Setup the stub. This stub will be called with two arguments.
      // The first is an options object and the second is a callback
      // that receives three args.
      // 1. the error object
      // 2. the response object
      // 3. the JSON response
      requestStub.yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'e2edemo-Docker-CI' }, { name: 'e2edemo-CI' }] }));

      // Act
      proxyApp.findOrCreateBuild(
         'mydemos',
         { name: 'e2edemo', id: 1 },
         'token',
         1,
         'dockerHostEndpoint',
         'dockerRegistryEndpoint',
         'dockerRegistryId',
         'filename',
         'docker',
         logger,
         function (err, data) {
            // Assert
            assert.equal('e2edemo-Docker-CI', data.name);

            done();
         });
   }));

   it('findOrCreateBuild should create build', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      this.stub(fs, 'readFileSync').returns('{"name": "{{BuildDefName}}"}');

      requestStub.onCall(0).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'e2edemo-CI' }] }));
      // Create build
      requestStub.onCall(1).yields(null, null, { name: 'e2edemo-Docker-CI' });

      // Act
      proxyApp.findOrCreateBuild(
         'mydemos',
         { name: 'e2edemo', id: 1 },
         'token',
         1,
         { id: 2 },
         { id: 3 },
         'dockerRegistryId',
         'filename',
         'docker',
         logger,
         function (err, data) {
            // Assert
            assert.equal('e2edemo-Docker-CI', data.name);

            done();
         });
   }));

   it('findOrCreateProject should find project', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      // Setup the stub. This stub will be called with two arguments.
      // The first is an options object and the second is a callback
      // that receives three args.
      // 1. the error object
      // 2. the response object
      // 3. the JSON response
      requestStub.yields(null, { statusCode: 200 }, JSON.stringify({ name: 'myProject' }));

      // Act
      proxyApp.findOrCreateProject(
         'mydemos',
         'e2edemo',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('myProject', data.name);

            done();
         });
   }));

   it('findOrCreateProject should throw', function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      const proxyApp = proxyquire('../generators/vsts/app.js', {
         'request': function (options, callback) {
            callback(new Error("boom"), null, null);
         }
      });

      var logger = sinon.stub();
      logger.log = function () { };

      proxyApp.findOrCreateProject(
         'mydemos',
         'e2edemo',
         'token',
         logger, function (err, data) {
            assert.ok(err);
            done();
         });
   });

   it('findOrCreateProject should create project', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      // Setup the stub. This stub will be called with two arguments.
      // The first is an options object and the second is a callback
      // that receives three args.
      // 1. the error object
      // 2. the response object
      // 3. the JSON response
      // Find or Create
      requestStub.onCall(0).yields(null, { statusCode: 404 }, null);
      // Create Project
      requestStub.onCall(1).yields(null, null, JSON.stringify({ name: 'myProject' }));
      // Check Status
      requestStub.onCall(2).yields(null, null, JSON.stringify({ status: 'succeeded' }));
      // Get Project
      requestStub.onCall(3).yields(null, { statusCode: 200 }, JSON.stringify({ name: 'myProject', id: 'myProjectID' }));

      // Act
      proxyApp.findOrCreateProject(
         'mydemos',
         'e2edemo',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('myProject', data.name);
            assert.equal('myProjectID', data.id);

            done();
         });
   }));

   it('findOrCreateProject should fail calling final GET', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      // Setup the stub. This stub will be called with two arguments.
      // The first is an options object and the second is a callback
      // that receives three args.
      // 1. the error object
      // 2. the response object
      // 3. the JSON response
      // Find or Create
      requestStub.onCall(0).yields(null, { statusCode: 404 }, null);
      // Create Project
      requestStub.onCall(1).yields(null, null, JSON.stringify({ name: 'myProject' }));
      // Check Status
      requestStub.onCall(2).yields(null, null, JSON.stringify({ status: 'succeeded' }));
      // Get Project
      requestStub.onCall(3).yields({ message: 'Error sending request' }, null, undefined);

      // Act
      proxyApp.findOrCreateProject(
         'mydemos',
         'e2edemo',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('Error sending request', err.message);

            done();
         });
   }));

   it('findOrCreateProject should fail to find new project', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };
      logger.log.error = function () { };

      // Setup the stub. This stub will be called with two arguments.
      // The first is an options object and the second is a callback
      // that receives three args.
      // 1. the error object
      // 2. the response object
      // 3. the JSON response
      // Find or Create
      requestStub.onCall(0).yields(null, { statusCode: 404 }, null);
      // Create Project
      requestStub.onCall(1).yields(null, null, JSON.stringify({ name: 'myProject' }));
      // Check Status
      requestStub.onCall(2).yields(null, null, JSON.stringify({ status: 'succeeded' }));
      // Get Project
      requestStub.onCall(3).yields(null, { statusCode: 404 }, null);

      // Act
      proxyApp.findOrCreateProject(
         'mydemos',
         'e2edemo',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('Unable to find newly created project.', err.message);

            done();
         });
   }));

   it('findOrCreateProject should force login', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };
      logger.log.error = function () { };

      // Setup the stub. This stub will be called with two arguments.
      // The first is an options object and the second is a callback
      // that receives three args.
      // 1. the error object
      // 2. the response object
      // 3. the JSON response
      // Find or Create
      requestStub.onCall(0).yields(null, { statusCode: 203 }, null);

      // Act
      proxyApp.findOrCreateProject(
         'mydemos',
         'e2edemo',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('Unable to authenticate with Team Services. Check account name and personal access token.', err.message);

            done();
         });
   }));

   it('findOrCreateDockerServiceEndpoint should handle undefined dockerHost', function (done) {
      // Arrange
      const app = require('../generators/vsts/app');

      // Act
      app.findOrCreateDockerServiceEndpoint(
         'mydemos',
         'e2edemo',
         undefined,
         undefined,
         'token',
         undefined,
         function (err, data) {
            // Assert
            assert.ok(!err);
            assert.ok(!data);

            done();
         });
   });

   it('findOrCreateDockerServiceEndpoint should find endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      var responseBody = JSON.stringify({ value: [{ url: 'tcp://127.0.0.1:2376/', name: 'test' }] });
      requestStub.yields(null, null, responseBody);

      // Act
      proxyApp.findOrCreateDockerServiceEndpoint(
         'mydemos',
         'e2edemo',
         'tcp://127.0.0.1:2376',
         'C:\\Users\\dlbm3\\.docker\\machine\\certs',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.equal('test', data.name);

            done();
         });
   }));

   it('findOrCreateDockerServiceEndpoint should create endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      var i = 0;
      var responseBody1 = JSON.stringify({ value: [{ url: 'tcp://10.0.0.1:2376/', name: 'Not Me' }] });
      var responseBody2 = { data: 'test' };
      requestStub.onCall(0).yields(null, null, responseBody1);
      requestStub.onCall(1).yields(null, null, responseBody2);

      this.stub(fs, 'readFile', function (files, options, cb) {
         if (cb === undefined) {
            cb = options;
         }

         cb(null, 'contents');
      });

      // Act
      proxyApp.findOrCreateDockerServiceEndpoint('mydemos', 'e2edemo', 'tcp://127.0.0.1:2376', 'C:\\Users\\dlbm3\\.docker\\machine\\certs', 'token', logger, function (err, data) {
         // Assert
         assert.equal('test', data.data);

         done();
      });
   }));

   it('findOrCreateDockerRegistryServiceEndpoint should handle undefined dockerRegistry', function (done) {
      // Arrange
      const app = require('../generators/vsts/app');

      // Act
      app.findOrCreateDockerRegistryServiceEndpoint(
         'mydemos',
         'e2edemo',
         undefined,
         undefined,
         undefined,
         undefined,
         'token',
         undefined,
         function (err, data) {
            // Assert
            assert.ok(!err);
            assert.ok(!data);

            done();
         });
   });

   it('findOrCreateDockerRegistryServiceEndpoint should find endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      var responseBody = JSON.stringify({ value: [{ type: 'dockerregistry', name: 'test' }] });
      requestStub.yields(null, null, responseBody);

      // Act
      proxyApp.findOrCreateDockerRegistryServiceEndpoint(
         'mydemos',
         'e2edemo',
         'AnyValue',
         undefined,
         undefined,
         undefined,
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.ok(!err);
            assert.equal('test', data.name);

            done();
         });
   }));

   it('findOrCreateDockerRegistryServiceEndpoint should create endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      var responseBody1 = JSON.stringify({ value: [{ type: 'docker', name: 'notme' }] });
      var responseBody2 = { data: 'test' };
      requestStub.onCall(0).yields(null, null, responseBody1);
      requestStub.onCall(1).yields(null, null, responseBody2);

      // Act
      proxyApp.findOrCreateDockerRegistryServiceEndpoint(
         'mydemos',
         'e2edemo',
         'dockerRegistry',
         'dockerRegistryId',
         'dockerRegistryPassword',
         'dockerRegistryEmail',
         'token',
         logger,
         function (err, data) {
            // Assert
            assert.ok(!err);
            assert.equal('test', data.data);

            done();
         });
   }));

   it('findOrCreateAzureServiceEndpoint should find endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      requestStub.yields(null, null, JSON.stringify({ value: [{ data: { subscriptionName: 'AzureSub' } }] }));

      // Act
      proxyApp.findOrCreateAzureServiceEndpoint('mydemos', 'e2edemo', { displayName: 'AzureSub' }, 'token', logger, function (err, data) {

         // Assert
         assert.equal('AzureSub', data.data.subscriptionName);

         done();
      });
   }));

   it('findOrCreateAzureServiceEndpoint should handle error', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      requestStub.onCall(0).yields(null, null, JSON.stringify({ value: [] }));
      requestStub.onCall(1).yields({ message: 'oh noes!' }, null, undefined);

      // Act
      proxyApp.findOrCreateAzureServiceEndpoint('mydemos', 'e2edemo', { displayName: 'AzureSub' }, 'token', logger, function (err, data) {
         // Assert
         assert.equal('oh noes!', err.message);

         done();
      });
   }));

   it('findOrCreateAzureServiceEndpoint should create endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      requestStub.onCall(0).yields(null, null, JSON.stringify({ value: [{ data: { subscriptionName: 'Not Me' } }] }));
      requestStub.onCall(1).yields(null, null, { data: { subscriptionName: 'AzureSub' } });
      // Check status
      requestStub.onCall(2).yields(null, null, JSON.stringify({ data: { subscriptionName: 'AzureSub' }, operationStatus: { state: 'Ready' } }));

      // Act
      proxyApp.findOrCreateAzureServiceEndpoint('mydemos', 'e2edemo', { displayName: 'AzureSub' }, 'token', logger, function (err, data) {
         // Assert
         assert.equal('AzureSub', data.data.subscriptionName);

         done();
      });
   }));

   it('findOrCreateAzureServiceEndpoint should fail to create endpoint', sinon.test(function (done) {
      // Arrange
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };
      logger.log.error = function () { };

      requestStub.onCall(0).yields(null, null, JSON.stringify({ value: [{ data: { subscriptionName: 'Not Me' } }] }));
      requestStub.onCall(1).yields(null, null, { data: { subscriptionName: 'AzureSub' } });
      // Check status
      requestStub.onCall(2).yields(null, null, JSON.stringify({ data: { subscriptionName: 'AzureSub' }, operationStatus: { state: 'Failed', statusMessage: 'You are out of luck.' } }));

      // Act
      proxyApp.findOrCreateAzureServiceEndpoint('mydemos', 'e2edemo', { displayName: 'AzureSub' }, 'token', logger, function (err, data) {
         // Assert
         assert.equal('Failed to create Azure Service Endpoint. You are out of luck.', err.message);

         done();
      });
   }));

   it('findOrCreateRelease should create release', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      this.stub(fs, 'readFileSync').returns('{"name": "{{ReleaseDefName}}"}');

      requestStub.onCall(0).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'notme' }] }));
      // In progress
      requestStub.onCall(1).yields(null, { statusCode: 300 }, { status: 'creating' });
      // Create release
      requestStub.onCall(2).yields(null, { statusCode: 200 }, { name: 'e2edemo-Docker-CD' });

      var relArgs = {
         token: 'token',
         build: { id: 1, name: 'e2eDemo-Docker-CI' },
         queueId: 420,
         account: 'mydemos',
         target: 'docker',
         appName: 'e2eDemo',
         approverId: 'approverId',
         teamProject: { id: 1, name: 'mydemos' },
         template: 'releaseJson',
         endpoint: 'azureEndpoint',
         dockerHostEndpoint: { id: 3 },
         approverUniqueName: 'approverUniqueName',
         dockerRegistryId: 'dockerRegistryId',
         approverDisplayName: 'approverDisplayName',
         dockerRegistryEndpoint: { id: 5 },
      };

      // Act
      proxyApp.findOrCreateRelease(
         relArgs,
         logger,
         function (err, data) {
            // Assert
            assert.equal('e2edemo-Docker-CD', data.name);

            done();
         });
   }));

   it('findOrCreateRelease should find release', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      this.stub(fs, 'readFileSync').returns('{"name": "{{ReleaseDefName}}"}');

      requestStub.yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'e2eDemo-Docker-CD' }] }));

      var relArgs = {
         token: 'token',
         build: { id: 1, name: 'e2eDemo-Docker-CI' },
         queueId: 420,
         account: 'mydemos',
         target: 'docker',
         appName: 'e2eDemo',
         approverId: 'approverId',
         teamProject: { id: 1, name: 'mydemos' },
         template: 'releaseJson',
         endpoint: 'azureEndpoint',
         dockerHostEndpoint: { id: 3 },
         approverUniqueName: 'approverUniqueName',
         dockerRegistryId: 'dockerRegistryId',
         approverDisplayName: 'approverDisplayName',
         dockerRegistryEndpoint: { id: 5 },
      };

      // Act
      proxyApp.findOrCreateRelease(
         relArgs,
         logger,
         function (err, data) {
            // Assert
            assert.equal('e2eDemo-Docker-CD', data.name);

            done();
         });
   }));

   it('findOrCreateRelease should fail on 400', sinon.test(function (done) {
      // Arrange
      // This allows me to take control of the request requirement
      // without this there would be no way to stub the request calls
      var requestStub = sinon.stub();
      const proxyApp = proxyquire('../generators/vsts/app.js', { 'request': requestStub });

      var logger = this.stub();
      logger.log = function () { };

      this.stub(fs, 'readFileSync').returns('{"name": "{{ReleaseDefName}}"}');

      requestStub.onCall(0).yields(null, { statusCode: 200 }, JSON.stringify({ value: [{ name: 'notme' }] }));
      // Failed
      requestStub.onCall(1).yields(null, { statusCode: 400, statusMessage: 'test failure' }, { status: 'failed' });

      var relArgs = {
         token: 'token',
         build: { id: 1, name: 'e2eDemo-Docker-CI' },
         queueId: 420,
         account: 'mydemos',
         target: 'docker',
         appName: 'e2eDemo',
         approverId: 'approverId',
         teamProject: { id: 1, name: 'mydemos' },
         template: 'releaseJson',
         endpoint: 'azureEndpoint',
         dockerHostEndpoint: { id: 3 },
         approverUniqueName: 'approverUniqueName',
         dockerRegistryId: 'dockerRegistryId',
         approverDisplayName: 'approverDisplayName',
         dockerRegistryEndpoint: { id: 5 },
      };

      // Act
      proxyApp.findOrCreateRelease(
         relArgs,
         logger,
         function (err, data) {
            // Assert
            assert.ok(err);

            done();
         });
   }));
});