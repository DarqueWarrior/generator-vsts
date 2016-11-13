// This is the main entry point of the generator.  The heavy lifting is done in the
// sub generator vsts.  I separated them so I could compose with language generators.
const url = require('url');
const yosay = require('yosay');
const generators = require('yeoman-generator');

// Carry the arguments
var templateData = {};

function construct() {
   // Calling the super constructor is important so our generator is correctly set up
   generators.Base.apply(this, arguments);

   // Order is important
   // These are position based arguments for this generator. If they are not provided
   // via the command line they will be queried during the prompting priority
   this.argument('type', { type: String, required: false, desc: 'the project type to create (asp, node or java)' });
   this.argument('applicationName', { type: String, required: false, desc: 'the name of the application' });
   this.argument('vsts', { type: String, required: false, desc: 'the vsts account not the full url. Your vsts account is the part before the .visualstudio.com' });
   this.argument('pat', { type: String, required: false, desc: 'the vsts Personal Access Token' });
   this.argument('azureSub', { type: String, required: false, desc: 'the Azure Subscription name' });
   this.argument('queue', { type: String, required: false, desc: 'the agent queue name to use' });
   this.argument('target', { type: String, required: false, desc: 'docker or Azure app service' });
   this.argument('installDep', { type: String, required: false, desc: 'if true dependencies are installed' });
   this.argument('groupId', { type: String, required: false, desc: 'the groupId of Java project' });
   this.argument('dockerHost', { type: String, required: false, desc: 'the Docker host url including port' });
   this.argument('dockerCertPath', { type: String, required: false, desc: 'the path to Docker certs folder' });
   this.argument('dockerRegistryId', { type: String, required: false, desc: 'the ID for Docker repository' });
   this.argument('dockerRegistryPassword', { type: String, required: false, desc: 'the password for your Docker repository' });
   this.argument('dockerRegistryEmail', { type: String, required: false, desc: 'the email used with your Docker repository' });
}

// Store all the values collected from the command line so we can pass to 
// sub generators. I also use this to determine which data I still need to
// prompt for.
function init() {
   this.log(yosay('Welcome to DevOps powered by Team Services'));
   templateData.answers = {
      pat: this.pat,
      type: this.type,
      vsts: this.vsts,
      queue: this.queue,
      target: this.target,
      groupId: this.groupId,
      azureSub: this.azureSub,
      installDep: this.installDep,
      dockerHost: this.dockerHost,
      dockerCertPath: this.dockerCertPath,
      applicationName: this.applicationName,
      dockerRegistryId: this.dockerRegistryId,
      dockerRegistryEmail: this.dockerRegistryEmail,
      dockerRegistryPassword: this.dockerRegistryPassword
   };
}

// Collect any missing data from the user.
function input() {
   return this.prompt([
      {
         type: 'list',
         name: 'type',
         store: true,
         message: 'What type of application do you want to create?',
         default: templateData.answers.type,
         choices: [
            {
               name: 'ASP.NET',
               value: 'asp'
            },
            {
               name: 'NodeJS',
               value: 'node'
            },
            {
               name: 'Java',
               value: 'java'
            },
         ],
         when: function () {
            return templateData.answers.type === undefined;
         }
      },
      {
         type: 'input',
         name: 'applicationName',
         store: true,
         message: "What's the name of your ASP.NET application?",
         default: templateData.answers.applicationName,
         when: function () {
            return templateData.answers.applicationName === undefined;
         }
      },
      {
         type: 'list',
         name: 'target',
         store: true,
         message: "Where would you like to deploy?",
         default: templateData.answers.target,
         choices: [
            {
               name: 'Azure App Service',
               value: 'paas'
            },
            {
               name: 'Docker',
               value: 'docker'
            }
         ],
         when: function () {
            return templateData.answers.target === undefined;
         }
      },
      {
         type: 'input',
         name: 'vsts',
         store: true,
         message: "What's your Team Services account name ({account}.visualstudio.com)?",
         validate: function(input) {
            // It was unclear if the user should provide the full URL or just 
            // the account name so I am adding validation to help.

            // If you find http or visualstudio.com in the name the user most
            // likely entered the entire URL instead of just the account name
            // so let them know.  Otherwise, just return true.
            if(input.toLowerCase().match(/visualstudio.com|http/) === null) {
               return true;
            }
            
            return "Only provide your account name ({account}.visualstudio.com) not the entire URL. Just the portion before .visualstudio.com.";
         },
         when: function () {
            return templateData.answers.vsts === undefined;
         }
      },
      {
         type: 'input',
         name: 'queue',
         store: true,
         message: "What agent queue would you like to use?",
         default: 'Hosted',
         when: function () {
            return templateData.answers.queue === undefined;
         }
      },
      {
         type: 'password',
         name: 'pat',
         store: false,
         message: "What's your Team Services Personal Access Token?",
         when: function () {
            return templateData.answers.pat === undefined;
         }
      },
      {
         type: 'input',
         name: 'azureSub',
         store: true,
         message: "What's your Azure subscription name?",
         when: function () {
            return templateData.answers.azureSub === undefined;
         }
      },
      {
         type: 'input',
         name: 'dockerHost',
         store: true,
         message: "What's your Docker host url and port (tcp://host:2376)?",
         when: function (answers) {
            // If you pass in the target on the command line 
            // answers.target will be undefined so test templateData
            return (answers.target === 'docker' || templateData.answers.target === 'docker') && templateData.answers.dockerHost === undefined;
         }
      },
      {
         type: 'input',
         name: 'dockerCertPath',
         store: true,
         message: "What's your Docker certificate path?",
         when: function (answers) {
            return (answers.target === 'docker' || templateData.answers.target === 'docker') && templateData.answers.dockerCertPath === undefined;
         }
      },
      {
         type: 'input',
         name: 'dockerRegistryId',
         store: true,
         message: "What's your Docker Hub ID (case sensitive)?",
         when: function (answers) {
            return (answers.target === 'docker' || templateData.answers.target === 'docker') && templateData.answers.dockerRegistryId === undefined;
         }
      },
      {
         type: 'password',
         name: 'dockerRegistryPassword',
         store: false,
         message: "What's your Docker Hub password?",
         when: function (answers) {
            return (answers.target === 'docker' || templateData.answers.target === 'docker') && templateData.answers.dockerRegistryPassword === undefined;
         }
      },
      {
         type: 'input',
         name: 'dockerRegistryEmail',
         store: true,
         message: "What's your Docker Hub email?",
         when: function (answers) {
            return (answers.target === 'docker' || templateData.answers.target === 'docker') && templateData.answers.dockerRegistryEmail === undefined;
         }
      },
      {
         type: 'input',
         name: 'groupId',
         store: true,
         message: "What's your Group ID?",
         when: function (answers) {
            return answers.type === 'java' && templateData.answers.groupId === undefined;
         }
      },
      {
         type: 'list',
         name: 'installDep',
         store: true,
         message: "Install dependencies?",
         default: 'false',
         choices: [
            {
               name: 'Yes',
               value: 'true'
            },
            {
               name: 'No',
               value: 'false'
            }
         ],
         when: function () {
            return templateData.answers.installDep === undefined;
         }
      }]).then(function (answers) {
         // Transfer answers to global object for use in the rest of the generator
         templateData.answers.pat = answers.pat ? answers.pat : templateData.answers.pat;
         templateData.answers.vsts = answers.vsts ? answers.vsts : templateData.answers.vsts;
         templateData.answers.type = answers.type ? answers.type : templateData.answers.type;
         templateData.answers.queue = answers.queue ? answers.queue : templateData.answers.queue;
         templateData.answers.target = answers.target ? answers.target : templateData.answers.target;
         templateData.answers.groupId = answers.groupId ? answers.groupId : templateData.answers.groupId;
         templateData.answers.azureSub = answers.azureSub ? answers.azureSub : templateData.answers.azureSub;
         templateData.answers.installDep = answers.installDep ? answers.installDep : templateData.answers.installDep;
         templateData.answers.dockerHost = answers.dockerHost ? answers.dockerHost : templateData.answers.dockerHost;
         templateData.answers.dockerCertPath = answers.dockerCertPath ? answers.dockerCertPath : templateData.answers.dockerCertPath;
         templateData.answers.applicationName = answers.applicationName ? answers.applicationName : templateData.answers.applicationName;
         templateData.answers.dockerRegistryId = answers.dockerRegistryId ? answers.dockerRegistryId : templateData.answers.dockerRegistryId;
         templateData.answers.dockerRegistryEmail = answers.dockerRegistryEmail ? answers.dockerRegistryEmail : templateData.answers.dockerRegistryEmail;
         templateData.answers.dockerRegistryPassword = answers.dockerRegistryPassword ? answers.dockerRegistryPassword : templateData.answers.dockerRegistryPassword;
      }.bind(this));
}

// Based on the users answers compose all the required generators.
function configGenerators() {
   if (templateData.answers.type === 'asp') {
      this.composeWith('vsts:asp', { args: [templateData.answers.applicationName, templateData.answers.installDep] });
   } else if (templateData.answers.type === 'node') {
      this.composeWith('vsts:node', { args: [templateData.answers.applicationName, templateData.answers.installDep, templateData.answers.target, templateData.answers.dockerHost ? templateData.answers.dockerHost : ""] });
   } else {
      this.composeWith('vsts:java', { args: [templateData.answers.applicationName, templateData.answers.groupId, templateData.answers.installDep] });
   }

   if (templateData.answers.target === 'docker') {
      this.composeWith('vsts:vsts', { args: [templateData.answers.type, templateData.answers.applicationName, templateData.answers.vsts, templateData.answers.pat, templateData.answers.azureSub, templateData.answers.queue, templateData.answers.target, templateData.answers.dockerHost, templateData.answers.dockerCertPath, templateData.answers.dockerRegistryId, templateData.answers.dockerRegistryPassword, templateData.answers.dockerRegistryEmail] });
   } else {
      this.composeWith('vsts:vsts', { args: [templateData.answers.type, templateData.answers.applicationName, templateData.answers.vsts, templateData.answers.pat, templateData.answers.azureSub, templateData.answers.queue, templateData.answers.target] });
   }
}

module.exports = generators.Base.extend({
   // The name `constructor` is important here
   constructor: construct,

   // 1. Your initialization methods (checking current project state, getting configs, etc)
   initializing: init,

   // 2. Where you prompt users for options (where you'd call this.prompt())
   prompting: input,

   // 3. Saving configurations and configure the project (creating .editorconfig files and other metadata files)
   configuring: configGenerators,

   // 4. default - If the method name doesn't match a priority, it will be pushed to this group.

   // 5. Where you write the generator specific files (routes, controllers, etc)
   writing: undefined,

   // 6. conflicts - Where conflicts are handled (used internally)

   // 7. Where installation are run (npm, bower)
   install: undefined,

   // 8. Called last, cleanup, say good bye, etc
   end: undefined
});