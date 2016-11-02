const path = require('path');
const sinon = require('sinon');
const fs = require('fs-extra');
const helpers = require('yeoman-test');
const assert = require('yeoman-assert');

describe('vsts:java docker', function () {
   var spawnStub;

   before(function (done) {
      helpers.run(path.join(__dirname, '../generators/java/index.js'))
         .withArguments(['javaUnitTest', 'false', 'docker', 'tcp://23.1.1.1:2376'])
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

   it('files should be generated', function () {
      assert.file([
         'javaUnitTest/.bowerrc',
         'javaUnitTest/.gitignore',
         'javaUnitTest/bower.json',
         'javaUnitTest/Dockerfile',
         'javaUnitTest/pom.xml',
         'javaUnitTest/README.md'
      ]);

      assert.fileContent('javaUnitTest/bower.json', '"name": "javaunittest"');
      assert.fileContent('javaUnitTest/Dockerfile', 'ADD target/javaUnitTest.war /usr/local/tomcat/webapps/ROOT.war');
   });
});

describe('vsts:java paas', function () {
   var bowerStub;

   before(function (done) {
      helpers.run(path.join(__dirname, '../generators/java/index.js'))
         .withArguments(['javaUnitTest', 'testGroupID', 'true', 'paas'])
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

   it('files should be generated', function () {
      assert.file([
         '.bowerrc',
         '.gitignore',
         'bower.json',
         'Dockerfile',
         'pom.xml',
         'README.md'
      ]);

      assert.fileContent('bower.json', '"name": "javaunittest"');
      assert.fileContent('Dockerfile', 'ADD target/javaUnitTest.war /usr/local/tomcat/webapps/ROOT.war');
   });
});