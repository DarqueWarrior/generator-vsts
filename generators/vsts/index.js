const url = require('url');
const path = require('path');
const app = require('./app.js');
const generators = require('yeoman-generator');

function construct() {
   // Calling the super constructor is important so our generator is correctly set up
   generators.Base.apply(this, arguments);

   // Order is important 
   this.argument('type', { type: String, required: false, desc: 'the project type to create' });
   this.argument('applicationName', { type: String, required: false, desc: 'the name of the application' });
   this.argument('vsts', { type: String, required: false, desc: 'the vsts account not the full url. Your vsts account is the part before the .visualstudio.com' });
   this.argument('pat', { type: String, required: false, desc: 'the vsts Personal Access Token' });
   this.argument('azureSub', { type: String, required: false, desc: 'the Azure Subscription name' });
   this.argument('queue', { type: String, required: false, desc: 'the agent queue name to use' });
   this.argument('target', { type: String, required: false, desc: 'docker or Azure app service' });
   this.argument('dockerHost', { type: String, required: false, desc: 'the docker host url including port' });
   this.argument('dockerCertPath', { type: String, required: false, desc: 'the path to docker certs folder' });
   this.argument('dockerRegistryId', { type: String, required: false, desc: 'the ID for Docker repository' });
   this.argument('dockerRegistryPassword', { type: String, required: false, desc: 'the password for your Docker repository' });
   this.argument('dockerRegistryEmail', { type: String, required: false, desc: 'the email used with your Docker repository' });
}

function configureVSTS() {
   var done = this.async();

   var build = '';
   var release = this.templatePath('release.json');

   if (this.type === 'asp') {
      if (this.target === 'docker') {
         build = this.templatePath('asp_docker_build.json');
         release = this.templatePath('asp_release_docker.json');
      } else {
         build = this.templatePath('asp_build.json');
      }
   } else if (this.type === 'node') {
      if (this.target === 'docker') {
         build = this.templatePath('node_docker_build.json');
         release = this.templatePath('node_release_docker.json');
      } else {
         build = this.templatePath('node_build.json');
      }
   } else {
      if (this.target === 'docker') {
         build = this.templatePath('java_docker_build.json');
         release = this.templatePath('java_release_docker.json');
      } else {
         build = this.templatePath('java_build.json');
      }
   }

   var args = {
      queue: this.queue,
      pat: this.pat,
      vsts: this.vsts,
      azureSub: this.azureSub,
      appName: this.applicationName,
      project: this.applicationName,
      buildJson: build,
      releaseJson: release,
      target: this.target
   };

   if (this.target === 'docker') {
      // We only support Docker Hub so set the dockerRegistry to 
      // https://index.docker.io/v1/
      var registry = "https://index.docker.io/v1/";

      args.dockerHost = this.dockerHost;
      args.dockerCertPath = this.dockerCertPath;
      args.dockerRegistry = registry;
      args.dockerRegistryId = this.dockerRegistryId;
      args.dockerRegistryPassword = this.dockerRegistryPassword;
      args.dockerRegistryEmail = this.dockerRegistryEmail;
   }

   var gen = this;

   app.run(args, this, function (err) {

      if (err === null) {
         // Clone the repo of the team project so the user only has to add 
         // and commit.
         gen.log(`+ Cloning repo https://${args.vsts}.visualstudio.com/DefaultCollection/_git/${args.project}`);
         gen.spawnCommandSync('git', ['clone', `https://${args.vsts}.visualstudio.com/DefaultCollection/_git/${args.project}`], { stdio: 'pipe' });
      }

      done();
   });
}

function commitCode() {
   var done = this.async();

   var projFolder = path.join(this.destinationRoot(), this.applicationName);
   process.chdir(projFolder);

   this.log(`+ Adding initial files`);
   // I don't want to see the output of this command
   this.spawnCommandSync('git', ['add', '--a'], { stdio: 'pipe' });

   this.log(`+ Committing initial files`);
   this.spawnCommandSync('git', ['commit', '-m', '"Init"'], { stdio: 'pipe' });

   this.log(`= Now all you have to do is push when ready`);

   done();
}

function writeFiles() {
   if (this.type === 'asp') {
      this.copy(this.sourceRoot() + '/asp_arm.json', this.applicationName + '/templates/website.json');
      this.copy(this.sourceRoot() + '/arm.parameters.json', this.applicationName + '/templates/website.parameters.json');
   } else if (this.type === 'node') {
      this.copy(this.sourceRoot() + '/node_arm.json', this.applicationName + '/templates/website.json');
      this.copy(this.sourceRoot() + '/arm.parameters.json', this.applicationName + '/templates/website.parameters.json');

      // This is not copied to templates for node it goes to src
      this.copy(this.sourceRoot() + '/parameters.xml', this.applicationName + '/src/parameters.xml');
   } else {
      this.copy(this.sourceRoot() + '/java_arm.json', this.applicationName + '/templates/website.json');
      this.copy(this.sourceRoot() + '/arm.parameters.json', this.applicationName + '/templates/website.parameters.json');
      this.copy(this.sourceRoot() + '/parameters.xml', this.applicationName + '/templates/parameters.xml');
   }
}

module.exports = generators.Base.extend({
   // The name `constructor` is important here
   constructor: construct,

   // 1. Your initialization methods (checking current project state, getting configs, etc)
   initializing: undefined,

   // 2. Where you prompt users for options (where you'd call this.prompt())
   prompting: undefined,

   // 3. Saving configurations and configure the project (creating .editorconfig files and other metadata files)
   configuring: configureVSTS,

   // 4. default - If the method name doesn't match a priority, it will be pushed to this group.

   // 5. Where you write the generator specific files (routes, controllers, etc)
   writing: writeFiles,

   // 6. conflicts - Where conflicts are handled (used internally)

   // 7. Where installation are run (npm, bower)
   install: undefined,

   // 8. Called last, cleanup, say good bye, etc
   end: commitCode
});