const path = require('path');
const generators = require('yeoman-generator');

function construct() {
   // Calling the super constructor is important so our generator is correctly set up
   generators.Base.apply(this, arguments);

   // Order is important 
   this.argument('applicationName', { type: String, required: false, desc: 'the name of the application' });
   this.argument('groupId', { type: String, required: false, desc: 'the groupId of Java project' });
   this.argument('installDep', { type: String, required: false, desc: 'if true dependencies are installed' });
}

function writeFiles() {
   var tokens = {
      name: this.applicationName,
      name_lowercase: this.applicationName.toLowerCase(),
      groupId: this.groupId,
      namespace: `${this.groupId}.${this.applicationName}`,
      tilesHeader: "<%@ taglib uri=&#39;http://tiles.apache.org/tags-tiles&#39; prefix=&#39;tiles&#39;%>"
   };

   var mainFolder = '/src/main/java/';
   var testFolder = '/src/test/java/';
   var parts = tokens.groupId.split('.');

   for (var i = 0; i < parts.length; i++) {
      mainFolder += parts[i];
      mainFolder += '/';

      testFolder += parts[i];
      testFolder += '/';
   }

   mainFolder += this.applicationName;
   testFolder += this.applicationName;

   var src = this.sourceRoot();
   var root = this.applicationName;

   this.copy(`${src}/.bowerrc`, `${root}/.bowerrc`);
   this.copy(`${src}/README.md`, `${root}/README.md`);
   this.copy(`${src}/gitignore`, `${root}/.gitignore`);
   this.fs.copyTpl(`${src}/pom.xml`, `${root}/pom.xml`, tokens);
   this.fs.copyTpl(`${src}/Dockerfile`, `${root}/Dockerfile`, tokens);
   this.fs.copyTpl(`${src}/bower.json`, `${root}/bower.json`, tokens);
   this.directory(`${src}/src/main/webapp/resources`, `${root}/src/main/webapp/resources`);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/web.xml`, `${root}/src/main/webapp/WEB-INF/web.xml`, tokens);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/tiles.xml`, `${root}/src/main/webapp/WEB-INF/tiles.xml`, tokens);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/spring-servlet.xml`, `${root}/src/main/webapp/WEB-INF/spring-servlet.xml`, tokens);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/views/home/about.jsp`, `${root}/src/main/webapp/WEB-INF/views/home/about.jsp`, tokens);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/views/home/index.jsp`, `${root}/src/main/webapp/WEB-INF/views/home/index.jsp`, tokens);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/views/home/contact.jsp`, `${root}/src/main/webapp/WEB-INF/views/home/contact.jsp`, tokens);
   this.fs.copyTpl(`${src}/src/main/webapp/WEB-INF/views/shared/layout.jsp`, `${root}/src/main/webapp/WEB-INF/views/shared/layout.jsp`, tokens);
   this.fs.copyTpl(`${src}/src/main/java/com/mycompany/controllers/HomeController.java`, `${root}${mainFolder}/controllers/HomeController.java`, tokens);
   this.fs.copyTpl(`${src}/src/test/java/com/mycompany/controllers/HomeControllerTest.java`, `${root}${testFolder}/controllers/HomeControllerTest.java`, tokens);
}

function install() {
   var done = this.async();

   if (this.installDep === 'true') {
      process.chdir(this.applicationName);

      this.log(`+ Running bower install`);
      // I don't want to see the output of this command
      this.spawnCommandSync('bower', ['install'], { stdio: 'pipe' });
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