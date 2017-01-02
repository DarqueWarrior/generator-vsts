const path = require('path');
const generators = require('yeoman-generator');

function construct() {
   // Calling the super constructor is important so our generator is correctly set up
   generators.Base.apply(this, arguments);

   // Order is important 
   this.argument('applicationName', { type: String, required: true, desc: 'the name of the application' });
   this.argument('installDep', { type: String, required: false, desc: 'if true dependencies are installed' });
}

function writeFiles() {
   var tokens = {
      name: this.applicationName,
      name_lowercase: this.applicationName.toLowerCase()
   };

   var src = this.sourceRoot();
   var root = this.applicationName;

   // Root files   
   this.copy(`${src}/README.md`, `${root}/README.md`);
   this.copy(`${src}/gitignore`, `${root}/.gitignore`);
   this.copy(`${src}/global.json`, `${root}/global.json`);   


   // Web App project
   src = `${this.sourceRoot()}/src/app`;
   root = `${this.applicationName}/src/${this.applicationName}`;
   this.fs.copyTpl(`${src}/.bowerrc`, `${root}/.bowerrc`, tokens);
   this.fs.copyTpl(`${src}/bower.json`, `${root}/bower.json`, tokens);

      // Project files
   this.copy(`${src}/App.csproj`, `${root}/App.csproj`);   
   this.fs.copyTpl(`${src}/App.xproj`, `${root}/App.xproj`, tokens);
   this.fs.copyTpl(`${src}/project.json`, `${root}/project.json`, tokens);
   this.copy(`${src}/project.lock.json`, `${root}/project.lock.json`);

   this.directory(`${src}/wwwroot`, `${root}/wwwroot`);
   this.directory(`${src}/Views/Home`, `${root}/Views/Home`);
   
   this.copy(`${src}/web.config`, `${root}/web.config`);
   this.copy(`${src}/appsettings.json`, `${root}/appsettings.json`);
   this.copy(`${src}/bundleconfig.json`, `${root}/bundleconfig.json`);
   this.copy(`${src}/Views/_ViewStart.cshtml`, `${root}/Views/_ViewStart.cshtml`);
   this.copy(`${src}/Views/Shared/Error.cshtml`, `${root}/Views/Shared/Error.cshtml`);

//    this.fs.copyTpl(`${src}/Dockerfile`, `${root}/Dockerfile`, tokens);
   this.fs.copyTpl(`${src}/Program.cs`, `${root}/Program.cs`, tokens);
   this.fs.copyTpl(`${src}/Startup.cs`, `${root}/Startup.cs`, tokens);

   this.fs.copyTpl(`${src}/Views/_ViewImports.cshtml`, `${root}/Views/_ViewImports.cshtml`, tokens);
   this.fs.copyTpl(`${src}/Views/Shared/_Layout.cshtml`, `${root}/Views/Shared/_Layout.cshtml`, tokens);
   this.fs.copyTpl(`${src}/Controllers/HomeController.cs`, `${root}/Controllers/HomeController.cs`, tokens);
   this.fs.copyTpl(`${src}/Properties/launchSettings.json`, `${root}/Properties/launchSettings.json`, tokens);

   // Now test project
   src = `${this.sourceRoot()}/test/app.tests`;
   root = `${this.applicationName}/test/${this.applicationName}.Tests`;

   this.fs.copyTpl(`${src}/project.json`, `${root}/project.json`, tokens);
   this.fs.copyTpl(`${src}/HomeControllerTest.cs`, `${root}/HomeControllerTest.cs`, tokens);
}

function install() {
   var done = this.async();

   if (this.installDep === 'true') {
      process.chdir(`${this.applicationName}/src/${this.applicationName}`);

      this.log(`+ Running bower install`);
      // I don't want to see the output of this command
      this.spawnCommandSync('bower', ['install'], { stdio: 'pipe' });

      this.log(`+ Running dotnet restore`);
      this.spawnCommandSync('dotnet', ['restore'], { stdio: 'pipe' });
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