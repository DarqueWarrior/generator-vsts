const path = require('path');
const sinon = require('sinon');
const fs = require('fs-extra');
const helpers = require('yeoman-test');
const assert = require('yeoman-assert');

describe('vsts:asp docker', function () {
   var spawnStub;

   before(function (done) {
      helpers.run(path.join(__dirname, '../generators/asp/index.js'))
         .withArguments(['aspUnitTest', 'false', 'docker', 'tcp://23.1.1.1:2376'])
         .on('error', function (error) {
            console.log('Oh Noes!', error);
         })
         .on('ready', function (generator) {
            // This is called right before `generator.run()` is called
            // Stub the calls to spawnCommandSync
            spawnStub = sinon.stub(generator, 'spawnCommandSync');
         })
         .on('end', done);
   });

   it('bower install should not be called', function () {
      assert.equal(0, spawnStub.withArgs('bower', ['install'], { stdio: 'pipe' }).callCount, 'bower install was called');
   });

   it('dotnet restore should not be called', function () {
      assert.equal(0, spawnStub.withArgs('dotnet', ['install'], { stdio: 'pipe' }).callCount, 'dotnet restore was called');
   });

   it('files should be generated', function () {
      assert.file([
         'aspUnitTest/README.md',
         'aspUnitTest/.gitignore',
         'aspUnitTest/global.json',
         'aspUnitTest/.bowerrc',
         'aspUnitTest/bower.json',
         'aspUnitTest/src/aspUnitTest/web.config',
         'aspUnitTest/src/aspUnitTest/appsettings.json',
         'aspUnitTest/src/aspUnitTest/Dockerfile',
         'aspUnitTest/src/aspUnitTest/project.json'
      ]);

      assert.fileContent('aspUnitTest/bower.json', '"name": "aspunittest"');
      assert.fileContent('aspUnitTest/src/aspUnitTest/project.json', '"defaultNamespace": "aspUnitTest"');
      assert.fileContent('aspUnitTest/src/aspUnitTest/Dockerfile', 'ENTRYPOINT dotnet aspUnitTest.dll');
   });
});

describe('vsts:asp paas', function () {
   var bowerStub;

   before(function (done) {
      helpers.run(path.join(__dirname, '../generators/asp/index.js'))
         .withArguments(['aspUnitTest', 'true', 'paas'])
         .on('error', function (error) {
            console.log('Oh Noes!', error);
         })
         .on('ready', function (generator) {
            // This is called right before `generator.run()` is called
            // Stub the calls to spawnCommandSync
            bowerStub = sinon.stub(generator, 'spawnCommandSync');
         })
         .on('end', done);
   });

   it('bower install should be called', function () {
      // Make sure the calls to install were made
      assert(bowerStub.withArgs('bower', ['install'], { stdio: 'pipe' }).calledOnce, 'bower install not called once');
   });

   it('dotnet restore should be called', function () {
      // Make sure the calls to install were made
      assert(bowerStub.withArgs('dotnet', ['restore'], { stdio: 'pipe' }).calledOnce, 'dotnet restore not called once');
   });

   it('files should be generated', function () {
      assert.file([
         '../../README.md',
         '../../.gitignore',
         '../../global.json',
         '../../.bowerrc',
         '../../bower.json',
         '../../src/aspUnitTest/web.config',
         '../../src/aspUnitTest/appsettings.json',
         '../../src/aspUnitTest/Dockerfile',
         '../../src/aspUnitTest/project.json'
      ]);

      assert.fileContent('../../bower.json', '"name": "aspunittest"');
      assert.fileContent('../../src/aspUnitTest/project.json', '"defaultNamespace": "aspUnitTest"');
      assert.fileContent('../../src/aspUnitTest/Dockerfile', 'ENTRYPOINT dotnet aspUnitTest.dll');
   });
});