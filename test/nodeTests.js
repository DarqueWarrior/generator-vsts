const path = require('path');
const sinon = require('sinon');
const fs = require('fs-extra');
const helpers = require('yeoman-test');
const assert = require('yeoman-assert');

describe('vsts:node docker', function () {
   var spawnStub;

   before(function (done) {
      helpers.run(path.join(__dirname, '../generators/node/index.js'))
         .withArguments(['nodeDemo', 'false', 'docker', 'tcp://23.1.1.1:2376'])
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

   it('npm install should not be called', function () {
      assert.equal(0, spawnStub.withArgs('npm', ['install'], { stdio: 'pipe' }).callCount, 'npm install was called');
   });

   it('files should be generated', function () {
      assert.file([
         'nodeDemo/.bowerrc',
         'nodeDemo/.gitignore',
         'nodeDemo/README.md',
         'nodeDemo/package.json',
         'nodeDemo/bower.json',
         'nodeDemo/src/app.js',
         'nodeDemo/src/web.config',
         'nodeDemo/src/Dockerfile',
         'nodeDemo/src/package.json',
      ]);

      assert.fileContent('nodeDemo/bower.json', '"name": "nodedemo"');
      assert.fileContent('nodeDemo/package.json', '"name": "nodedemo"');
      assert.fileContent('nodeDemo/src/package.json', '"name": "nodedemo"');
      assert.fileContent('nodeDemo/src/server.js', "var debug = require('debug')('nodeDemo:server');");
   });
});

describe('vsts:node paas', function () {
   var bowerStub;

   before(function (done) {
      helpers.run(path.join(__dirname, '../generators/node/index.js'))
         .withArguments(['nodeDemo', 'true', 'paas'])
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

   it('npm install should be called', function () {
      // Make sure the calls to install were made
      assert(bowerStub.withArgs('npm', ['install'], { stdio: 'pipe' }).calledOnce, 'npm install not called once');
   });

   it('files should be generated', function () {
      assert.file([
         '.bowerrc',
         '.gitignore',
         'README.md',
         'package.json',
         'bower.json',
         'src/app.js',
         'src/web.config',
         'src/Dockerfile',
         'src/package.json',
      ]);

      assert.fileContent('bower.json', '"name": "nodedemo"');
      assert.fileContent('package.json', '"name": "nodedemo"');
      assert.fileContent('src/package.json', '"name": "nodedemo"');
      assert.fileContent('src/server.js', "var debug = require('debug')('nodeDemo:server');");
   });
});