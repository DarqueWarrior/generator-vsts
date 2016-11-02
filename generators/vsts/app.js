// This is the code that deals with VSTS
const fs = require('fs');
const url = require('url');
const path = require('path');
const async = require('async');
const https = require('https');
const request = require('request');
const util = require('./utility.js');

const BUILD_API_VERSION = '2.0';
const PROJECT_API_VERSION = '1.0';
const RELEASE_API_VERSION = '3.0-preview.1';
const DISTRIBUTED_TASK_API_VERSION = '3.0-preview.1';
const SERVICE_ENDPOINTS_API_VERSION = '3.0-preview.1';

function run(args, gen, done) {
   'use strict';

   var build = {};
   var approverId;
   var queueId = 0;
   var release = {};
   var azureSub = {};
   var teamProject = {};
   var azureEndpoint = {};
   var approverUniqueName;
   var approverDisplayName;
   var dockerEndpoint = {};
   var dockerRegistryEndpoint = {};
   var token = encodePat(args.pat);

   async.series([
      function (mainSeries) {
         findOrCreateProject(args.vsts, args.project, token, gen, function (err, tp) {
            teamProject = tp;
            mainSeries(err, tp);
         });
      },
      function (mainSeries) {
         async.parallel([
            function (inParallel) {
               findQueue(args.queue, args.vsts, teamProject, token, gen, function (err, id) {
                  queueId = id;
                  gen.log(`+ Found agent queue`);
                  inParallel(err, id);
               });
            },
            function (inParallel) {
               findAzureSub(args.vsts, args.azureSub, token, gen, function (err, sub) {
                  azureSub = sub;

                  if (sub === undefined) {
                     err = { message: `${args.azureSub} Azure subscription not found` };
                     gen.log.error(`${args.azureSub} Azure subscription not found.`);
                  } else {
                     gen.log(`+ Found ${args.azureSub} Azure subscription`);
                  }
                  inParallel(err, sub);
               });
            }
         ], mainSeries);
      },
      function (mainSeries) {
         async.parallel([
            function (inParallel) {
               findOrCreateDockerServiceEndpoint(args.vsts, teamProject.id, args.dockerHost, args.dockerCertPath, token, gen, function (err, ep) {
                  dockerEndpoint = ep;
                  inParallel(err, dockerEndpoint);
               });
            },
            function (inParallel) {
               findOrCreateDockerRegistryServiceEndpoint(args.vsts, teamProject.id, args.dockerRegistry, args.dockerRegistryId, args.dockerRegistryPassword, args.dockerRegistryEmail, token, gen, function (err, ep) {
                  dockerRegistryEndpoint = ep;
                  inParallel(err, dockerRegistryEndpoint);
               });
            }
         ], mainSeries);
      },
      function (mainSeries) {
         async.parallel([
            function (inParallel) {
               findOrCreateBuild(args.vsts, teamProject, token, queueId, dockerEndpoint, dockerRegistryEndpoint, args.dockerRegistryId, args.buildJson, args.target, gen, function (err, bld) {
                  build = bld;
                  approverId = bld.authoredBy.id;
                  approverDisplayName = bld.authoredBy.displayName;
                  approverUniqueName = bld.authoredBy.uniqueName;
                  inParallel(err, bld);
               });
            },
            function (inParallel) {
               findOrCreateAzureServiceEndpoint(args.vsts, teamProject.id, azureSub, token, gen, function (err, ep) {
                  azureEndpoint = ep;
                  inParallel(err, azureEndpoint);
               });
            }
         ], mainSeries);
      },
      function (mainSeries) {
         var relArgs = {
            token: token,
            build: build,
            queueId: queueId,
            account: args.vsts,
            target: args.target,
            appName: args.appName,
            approverId: approverId,
            teamProject: teamProject,
            template: args.releaseJson,
            endpoint: azureEndpoint.id,
            dockerHostEndpoint: dockerEndpoint,
            approverUniqueName: approverUniqueName,
            dockerRegistryId: args.dockerRegistryId,
            approverDisplayName: approverDisplayName,
            dockerRegistryEndpoint: dockerRegistryEndpoint,
         };

         findOrCreateRelease(relArgs, gen, function (err, rel) {
            mainSeries(err, rel);
         });
      }
   ], function (err, results) {
      // This is just for test and will be undefined during normal use
      if (done) {
         done(err);
      }

      if (err) {
         // To get the stacktrace run with the --debug built-in option when 
         // running the generator.
         gen.env.error(err.message);
      }
   });
}

function findOrCreateProject(account, project, token, gen, callback) {
   'use strict';

   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/DefaultCollection/_apis/projects/${project}`,
      qs: { 'api-version': PROJECT_API_VERSION }
   };

   request(options, function (err, res, body) {

      if (err) {
         callback(err);
         return;
      }

      // Test for this before you try and parse the body.
      // When a 203 is returned the body is HTML instead of
      // JSON and will throw an exception if you try and parse.
      if (res.statusCode === 203) {
         // You get this when the site tries to send you to the 
         // login page.
         gen.log.error('Unable to authenticate with Team Services. Check account name and personal access token.');
         callback({ message: 'Unable to authenticate with Team Services. Check account name and personal access token.' });
         return;
      }

      var obj = JSON.parse(body);

      if (res.statusCode === 404) {
         gen.log(`+ Creating ${project} Team Project`);

         var teamProject = {};

         // Create the project
         // Use series to issue the REST API to create the project,
         // wait for it to be created or fail, and get the final id.
         async.series([
            function (thisSeries) {
               createProject(account, project, token, gen, function (err, project) {
                  teamProject = project;
                  thisSeries(err);
               });
            },
            function (thisSeries) {
               var status = '';

               // Wait for Team Services to report that the project was created.
               // Use whilst to keep calling the the REST API until the status is
               // either failed or succeeded.
               async.whilst(
                  function () { return status !== 'failed' && status !== 'succeeded'; },
                  function (finished) {
                     checkStatus(teamProject.url, token, gen, function (err, stat) {
                        status = stat.status;
                        finished(err);
                     });
                  },
                  thisSeries
               );
            },
            function (thisSeries) {
               // Get the real id of the team project now that is exist.
               request(options, function (err, res, body) {
                  if (err) {
                     thisSeries(err);
                     return;
                  }

                  if (res.statusCode !== 200) {
                     gen.log.error('Unable to find newly created project.');
                     thisSeries({ message: 'Unable to find newly created project.' });
                     return;
                  }

                  var project = JSON.parse(body);
                  thisSeries(err, project);
               });
            }
         ], function (err, result) {
            // By the time I get there the series would have completed and
            // the first two entries in result would be null.  I only want
            // to return the team project and not the array because when we
            // find the team project if it already exist we only return the
            // team project.
            callback(err, result[2]);
         });
      } else {
         // Return the team project we just found.
         gen.log(`+ Found Team project`);
         callback(err, obj);
      }
   });
}

function createProject(account, project, token, gen, callback) {
   'use strict';

   var options = {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Basic ${token}` },
      json: true,
      url: `https://${account}.visualstudio.com/DefaultCollection/_apis/projects`,
      qs: { 'api-version': PROJECT_API_VERSION },
      body: {
         name: project,
         capabilities: {
            versioncontrol: { sourceControlType: 'Git' },
            processTemplate: {
               templateTypeId: '6b724908-ef14-45cf-84f8-768b5384da45'
            }
         }
      }
   };

   request(options, function (err, res, body) {
      callback(err, body);
   });
}

// Simply issues a get to the provided URI and returns
// the body as JSON.  Call this when the action taken 
// requires time to process.
function checkStatus(uri, token, gen, callback) {
   'use strict';

   var options = {
      method: 'GET',
      headers: { authorization: `Basic ${token}` },
      url: uri
   };

   request(options, function (err, res, body) {
      callback(err, JSON.parse(body));
   });
}

function findQueue(name, account, teamProject, token, gen, callback) {
   'use strict';

   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/DefaultCollection/${teamProject.id}/_apis/distributedtask/queues`,
      qs: { 'api-version': DISTRIBUTED_TASK_API_VERSION, 'queueName': name }
   };

   request(options, function (err, res, body) {
      var obj = JSON.parse(body);

      if (res.statusCode >= 400) {
         callback(new Error(res.statusMessage), null);
      } else if (res.statusCode >= 300) {
         // When it is a 300 the obj is a error
         // object from the server
         callback(obj);
      } else {
         // Setting to null is the all clear signal to the async
         // series to continue
         callback(null, obj.value[0].id);
      }
   });
}

function findOrCreateRelease(args, gen, callback) {
   'use strict';

   var name = args.target === 'docker' ? `${args.appName}-Docker-CD` : `${args.appName}-CD`;
   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${args.token}` },
      url: `https://${args.account}.vsrm.visualstudio.com/DefaultCollection/${args.teamProject.id}/_apis/release/definitions`,
      qs: { 'api-version': RELEASE_API_VERSION }
   };

   request(options, function (error, response, body) {
      var obj = JSON.parse(body);

      var rel = obj.value.find(function (i) { return i.name === name; });

      if (rel === undefined) {
         createRelease(args, gen, callback);
      } else {
         gen.log(`+ Found release definition`);
         callback(error, rel);
      }
   });
}

function createRelease(args, gen, callback) {
   'use strict';

   gen.log(`+ Creating CD release definition`);

   // Load the template and replace values.
   var tokens = {
      '{{BuildId}}': args.build.id,
      '"{{QueueId}}"': args.queueId,
      '{{WebAppName}}': args.appName,
      '{{BuildName}}': args.build.name,
      '{{ApproverId}}': args.approverId,
      '{{ProjectId}}': args.teamProject.id,
      '{{ConnectedServiceID}}': args.endpoint,
      '{{ProjectName}}': args.teamProject.name,
      '{{ApproverUniqueName}}': args.approverUniqueName,
      '{{ApproverDisplayName}}': args.approverDisplayName,
      '{{ProjectLowerCase}}': args.teamProject.name.toLowerCase(),
      '{{dockerHostEndpoint}}': args.dockerHostEndpoint ? args.dockerHostEndpoint.id : null,
      '{{dockerRegistryId}}': args.dockerRegistryId ? args.dockerRegistryId.toLowerCase() : null,
      '{{dockerRegistryEndpoint}}': args.dockerRegistryEndpoint ? args.dockerRegistryEndpoint.id : null,
      '{{ReleaseDefName}}': args.target === 'docker' ? `${args.teamProject.name}-Docker-CD` : `${args.teamProject.name}-CD`
   };

   var contents = fs.readFileSync(args.template, 'utf8');

   var options = {
      method: 'POST',
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': `Basic ${args.token}` },
      json: true,
      url: `https://${args.account}.vsrm.visualstudio.com/DefaultCollection/${args.teamProject.id}/_apis/release/definitions`,
      qs: { 'api-version': RELEASE_API_VERSION },
      body: JSON.parse(util.tokenize(contents, tokens))
   };

   // I have witnessed the release returning a 403 if you try 
   // to create it too quickly.  The release REST API appears
   // to return 403 for several reasons and could cause an 
   // infinite loop on this code waiting on RM to become ready.
   var status = '';

   async.whilst(
      function () { return status !== 'failed' && status !== 'succeeded'; },
      function (finished) {
         request(options, function (err, resp, body) {

            if (resp.statusCode == 400) {
               status = "failed";
               finished(new Error(resp.statusMessage), null);
            } else if (resp.statusCode >= 300) {
               status = "in progress";
               finished(err, null);
            } else {
               status = "succeeded";
               finished(err, body);
            }
         });
      },
      function (err, results) {
         callback(err, results);
      }
   );
}

function findOrCreateDockerRegistryServiceEndpoint(
   account,
   projectId,
   dockerRegistry,
   dockerRegistryId,
   dockerRegistryPassword,
   dockerRegistryEmail,
   token,
   gen,
   callback) {
   'use strict';

   // There is nothing to do
   if (dockerRegistry === undefined) {
      callback(null, null);
      return;
   }

   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints`,
      qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION }
   };

   request(options, function (error, response, body) {
      var obj = JSON.parse(body);

      // TODO: Test that authorization.parameters.registry === dockerHost.  But that requires
      // a second REST call once you know the ID of the dockerregistry type service endpoint.
      // For now assume any dockerregistry service endpoint is safe to use.
      var endpoint = obj.value.find(function (i) { return i.type === 'dockerregistry'; });

      if (endpoint === undefined) {
         createDockerRegistryServiceEndpoint(account, projectId, dockerRegistry, dockerRegistryId, dockerRegistryPassword, dockerRegistryEmail, token, gen, callback);
      } else {
         gen.log('+ Found Docker Registry Service Endpoint');
         callback(error, endpoint);
      }
   });
}

function createDockerRegistryServiceEndpoint(account, projectId, dockerRegistry, dockerRegistryId, dockerRegistryPassword, dockerRegistryEmail, token, gen, callback) {
   'use strict';

   gen.log('+ Creating Docker Registry Service Endpoint');

   var options = {
      method: 'POST',
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': `Basic ${token}` },
      json: true,
      url: `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints`,
      qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION },
      body: {
         authorization:
         {
            parameters: {
               email: dockerRegistryEmail,
               password: dockerRegistryPassword,
               registry: dockerRegistry,
               username: dockerRegistryId
            },
            scheme: 'UsernamePassword'
         },
         data: {},
         name: 'Docker Registry',
         type: 'dockerregistry',
         url: 'http://hub.docker.com'
      }
   };

   request(options, function (error, response, body) {
      callback(error, body);
   });
}

function findOrCreateDockerServiceEndpoint(account, projectId, dockerHost, dockerCertPath, token, gen, callback) {
   'use strict';

   // There is nothing to do
   if (dockerHost === undefined) {
      callback(null, null);
      return;
   }

   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints`,
      qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION }
   };

   request(options, function (error, response, body) {
      var obj = JSON.parse(body);

      // The i.url is returned with a trailing / so just use starts with just in case
      // the dockerHost is passed in without it
      var endpoint = obj.value.find(function (i) { return i.url.startsWith(dockerHost); });

      if (endpoint === undefined) {
         createDockerServiceEndpoint(account, projectId, dockerHost, dockerCertPath, token, gen, callback);
      } else {
         gen.log('+ Found Docker Service Endpoint');
         callback(error, endpoint);
      }
   });
}

function createDockerServiceEndpoint(account, projectId, dockerHost, dockerCertPath, token, gen, callback) {
   'use strict';

   gen.log('+ Creating Docker Service Endpoint');

   // Find the contents of the files.
   var ca = path.join(dockerCertPath, 'ca.pem');
   var key = path.join(dockerCertPath, 'key.pem');
   var cert = path.join(dockerCertPath, 'cert.pem');

   var caContents, keyContents, certContents;

   async.map([ca, key, cert], fs.readFile, function (err, results) {
      caContents = results[0].toString();
      keyContents = results[1].toString();
      certContents = results[2].toString();

      var options = {
         method: 'POST',
         headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': `Basic ${token}` },
         json: true,
         url: `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints`,
         qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION },
         body: {
            authorization:
            {
               parameters: {
                  cacert: caContents,
                  cert: certContents,
                  certificate: '',
                  key: keyContents
               },
               scheme: 'Certificate'
            },
            data: {},
            name: 'Docker',
            type: 'dockerhost',
            url: dockerHost
         }
      };

      request(options, function (error, response, body) {
         callback(error, body);
      });
   });
}

function findOrCreateAzureServiceEndpoint(account, projectId, sub, token, gen, callback) {
   'use strict';

   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints`,
      qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION }
   };

   request(options, function (error, response, body) {
      var obj = JSON.parse(body);

      var endpoint = obj.value.find(function (i) { return i.data.subscriptionName === sub.displayName; });

      if (endpoint === undefined) {
         createAzureServiceEndpoint(account, projectId, sub, token, gen, callback);
      } else {
         gen.log(`+ Found Azure Service Endpoint '${sub.displayName}'`);
         callback(error, endpoint);
      }
   });
}

function createAzureServiceEndpoint(account, projectId, sub, token, gen, callback) {
   'use strict';

   gen.log(`+ Creating ${sub.displayName} Azure Service Endpoint`);

   var options = {
      method: 'POST',
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': `Basic ${token}` },
      json: true,
      url: `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints`,
      qs: { 'api-version': SERVICE_ENDPOINTS_API_VERSION },
      body: {
         authorization:
         {
            parameters: { serviceprincipalid: '', serviceprincipalkey: '', tenantid: sub.subscriptionTenantId },
            scheme: 'ServicePrincipal'
         },
         data:
         {
            subscriptionId: sub.subscriptionId,
            subscriptionName: sub.displayName,
            creationMode: 'Automatic'
         },
         name: sub.displayName,
         type: 'azurerm',
         url: 'https://management.core.windows.net/'
      }
   };

   request(options, function (err, response, obj) {
      if (err) {
         callback(err);
         return;
      }

      // Service endpoints are not created instantly 
      // we need to wait for the status to be Failed or
      // Ready before proceeding.
      var url = `https://${account}.visualstudio.com/${projectId}/_apis/distributedtask/serviceendpoints/${obj.id}?api-version=${SERVICE_ENDPOINTS_API_VERSION}`;

      var status = '';

      async.whilst(
         function () { return status !== 'Failed' && status !== 'Ready'; },
         function (finished) {
            checkStatus(url, token, gen, function (err, ep) {
               status = ep.operationStatus.state;
               finished(err, ep);
            });
         },
         function (err, body) {

            if (body.operationStatus.state === 'Failed') {
               err = { message: `Failed to create Azure Service Endpoint. ${body.operationStatus.statusMessage}` };
               gen.log.error(`Failed to create Azure Service Endpoint. ${body.operationStatus.statusMessage}`);
            }

            callback(err, body);
         }
      );
   });
}

function findAzureSub(account, subName, token, gen, callback) {
   'use strict';

   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/_apis/distributedtask/serviceendpointproxy/azurermsubscriptions`
   };

   request(options, function (error, response, body) {
      var obj = JSON.parse(body);

      var sub = obj.value.find(function (i) { return i.displayName === subName; });

      callback(error, sub);
   });
}

function findOrCreateBuild(
   account,
   teamProject,
   token,
   queueId,
   dockerHostEndpoint,
   dockerRegistryEndpoint,
   dockerRegistryId,
   filename,
   target,
   gen,
   callback) {
   'use strict';

   var name = target === 'docker' ? `${teamProject.name}-Docker-CI` : `${teamProject.name}-CI`;
   var options = {
      method: 'GET',
      headers: { 'cache-control': 'no-cache', 'authorization': `Basic ${token}` },
      url: `https://${account}.visualstudio.com/DefaultCollection/${teamProject.id}/_apis/build/definitions`,
      qs: { 'api-version': BUILD_API_VERSION }
   };

   request(options, function (error, response, body) {
      var obj = JSON.parse(body);

      var bld = obj.value.find(function (i) { return i.name === name; });

      if (bld === undefined) {
         createBuild(account, teamProject, token, queueId, dockerHostEndpoint, dockerRegistryEndpoint, dockerRegistryId, filename, target, gen, callback);
      } else {
         gen.log(`+ Found build definition`);
         callback(error, bld);
      }
   });
}

function createBuild(account, teamProject, token, queueId, dockerHostEndpoint, dockerRegistryEndpoint, dockerRegistryId, filename, target, gen, callback) {
   'use strict';

   gen.log('+ Creating CI build definition');

   // Load the template and replace values.
   var contents = fs.readFileSync(filename, 'utf8');
   var tokens = {
      '{{BuildDefName}}': target === 'docker' ? `${teamProject.name}-Docker-CI` : `${teamProject.name}-CI`,
      '{{VSTS}}': account,
      '{{Project}}': teamProject.name,
      '{{QueueId}}': queueId,
      '{{dockerHostEndpoint}}': dockerHostEndpoint ? dockerHostEndpoint.id : null,
      '{{dockerRegistryEndpoint}}': dockerRegistryEndpoint ? dockerRegistryEndpoint.id : null,
      '{{dockerRegistryId}}': dockerRegistryId ? dockerRegistryId.toLowerCase() : null,
      '{{ProjectLowerCase}}': teamProject.name.toLowerCase()
   };

   contents = util.tokenize(contents, tokens);

   // Validates my contents is valid JSON and stripes all the new lines
   var payload = JSON.parse(contents);

   var options = {
      method: 'POST',
      headers: { 'cache-control': 'no-cache', 'content-type': 'application/json', 'authorization': `Basic ${token}` },
      json: true,
      url: `https://${account}.visualstudio.com/DefaultCollection/${teamProject.id}/_apis/build/definitions`,
      qs: { 'api-version': BUILD_API_VERSION },
      body: payload
   };

   request(options, function (error, response, body) {
      callback(error, body);
   });
}

function encodePat(pat) {
   var b = new Buffer(':' + pat);
   var s = b.toString('base64');

   return s;
}

//
// Exports the portions of the file we want to share with files that require 
// it.
//
module.exports = {
   run: run,
   encodePat: encodePat,
   findQueue: findQueue,
   findAzureSub: findAzureSub,
   findOrCreateBuild: findOrCreateBuild,
   findOrCreateRelease: findOrCreateRelease,
   findOrCreateProject: findOrCreateProject,
   findOrCreateAzureServiceEndpoint: findOrCreateAzureServiceEndpoint,
   findOrCreateDockerServiceEndpoint: findOrCreateDockerServiceEndpoint,
   findOrCreateDockerRegistryServiceEndpoint: findOrCreateDockerRegistryServiceEndpoint
};