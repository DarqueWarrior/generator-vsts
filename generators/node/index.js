const url = require('url');
const ejs = require('ejs');
const path = require('path');
const generators = require('yeoman-generator');

function construct() {
   // Calling the super constructor is important so our generator is correctly set up
   generators.Base.apply(this, arguments);

   // Order is important 
   this.argument('applicationName', { type: String, required: false, desc: 'the name of the application' });
   this.argument('installDep', { type: String, required: false, desc: 'if true dependencies are installed' });
   this.argument('target', { type: String, required: false, desc: 'docker or Azure app service' });
   this.argument('dockerHost', { type: String, required: false, desc: 'the docker host url including port' });
}

function writeFiles() {
   var testAddress = `http://${this.applicationName}dev.azurewebsites.net`;

   if (this.target === 'docker') {
      var parts = url.parse(this.dockerHost);
      testAddress = `http://${parts.hostname}:3000`;
   }

   var tokens = {
      name: this.applicationName,
      name_lowercase: this.applicationName.toLowerCase(),
      testURL: testAddress
   };

   var src = this.sourceRoot();
   var root = this.applicationName;

   // Root files
   this.copy(`${src}/.bowerrc`, `${root}/.bowerrc`);
   this.copy(`${src}/README.md`, `${root}/README.md`);
   this.copy(`${src}/gitignore`, `${root}/.gitignore`);
   this.fs.copyTpl(`${src}/bower.json`, `${root}/bower.json`, tokens);
   this.fs.copyTpl(`${src}/package.json`, `${root}/package.json`, tokens);

   // Web App project
   src = `${this.sourceRoot()}/src`;
   root = `${this.applicationName}/src`;

   this.copy(`${src}/app.js`, `${root}/app.js`);
   this.copy(`${src}/web.config`, `${root}/web.config`);
   this.copy(`${src}/Dockerfile`, `${root}/Dockerfile`);
   this.fs.copyTpl(`${src}/package.json`, `${root}/package.json`, tokens);

   this.directory(`${src}/public`, `${root}/public`);
   this.directory(`${src}/routes`, `${root}/routes`);
   this.fs.copyTpl(`${src}/server.js`, `${root}/server.js`, tokens);

   this.copy(`${src}/views/about.pug`, `${root}/views/about.pug`);
   this.copy(`${src}/views/error.pug`, `${root}/views/error.pug`);
   this.copy(`${src}/views/index.pug`, `${root}/views/index.pug`);
   this.copy(`${src}/views/contact.pug`, `${root}/views/contact.pug`);
   this.fs.copyTpl(`${src}/views/layout.pug`, `${root}/views/layout.pug`, tokens);

   // Now test project
   src = `${this.sourceRoot()}/test`;
   root = `${this.applicationName}/test`;

   this.copy(`${src}/unitTest.js`, `${root}/unitTest.js`);
   this.fs.copyTpl(`${src}/uiTest.js`, `${root}/uiTest.js`, tokens);
}

function install() {
   var done = this.async();

   if (this.installDep === 'true') {
      process.chdir(this.applicationName);

      this.log(`+ Running bower install`);
      // I don't want to see the output of this command
      this.spawnCommandSync('bower', ['install'], { stdio: 'pipe' });

      this.log(`+ Running npm install`);
      this.spawnCommandSync('npm', ['install'], { stdio: 'pipe' });
   }

   done();
}

module.exports = generators.Base.extend({
   // The name `constructor` is important here
   constructor: construct,

   // 1. Your initialization methods (checking current project state, getting configs, etc)
   initializing: undefined,

   // 2. Where you prompt users for options (where you'd call this.prompt())
   prompting: undefined,

   // 3. Saving configurations and configure the project (creating .editorconfig files and other metadata files)
   configuring: undefined,

   // 4. default - If the method name doesn't match a priority, it will be pushed to this group.

   // 5. Where you write the generator specific files (routes, controllers, etc)
   writing: writeFiles,

   // 6. conflicts - Where conflicts are handled (used internally)

   // 7. Where installation are run (npm, bower)
   install: install,

   // 8. Called last, cleanup, say good bye, etc
   end: undefined
});