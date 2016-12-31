const request = require(`request`);

const BUILD_API_VERSION = `2.0`;
const PROJECT_API_VERSION = `1.0`;
const RELEASE_API_VERSION = `3.0-preview.3`;
const DISTRIBUTED_TASK_API_VERSION = `3.0-preview.1`;
const SERVICE_ENDPOINTS_API_VERSION = `3.0-preview.1`;

function encodePat(pat) {
   'use strict';

   // The personal access token must be 64 bit encoded to be used
   // with the REST API

   var b = new Buffer(`:` + pat);
   var s = b.toString(`base64`);

   return s;
}

function validateRequired(input, msg) {
   return !input ? msg : true;
}

function validatePersonalAccessToken(input) {
   return validateRequired(input, `You must provide a Personal Access Token`);
}

function validateVSTS(input) {
   // It was unclear if the user should provide the full URL or just 
   // the account name so I am adding validation to help.

   // If you find http or visualstudio.com in the name the user most
   // likely entered the entire URL instead of just the account name
   // so let them know.  Otherwise, just return true.
   if (input.toLowerCase().match(/visualstudio.com|http/) === null) {
      return true;
   }

   return "Only provide your account name ({account}.visualstudio.com) not the entire URL. Just the portion before .visualstudio.com.";
}

function getFullURL(instance) {
   // When used with VSTS all the user provides is the account name. But When
   // it is used with TFS they give the full url including the collection. This
   // functions makes sure any code needing the full URL gets that they need to
   // continue without worrying if it is TFS or VSTS.
   if (input.toLowerCase().match(/http/) === null) {
      return instance;
   }
   
   return `https://${instance}.visualstudio.com/`;
}

function getPools(answers) {
   "use strict";

   var token = encodePat(answers.pat);

   var options = {
      "method": `GET`,
      "headers": {
         "cache-control": `no-cache`, "authorization": `Basic ${token}`
      },
      "url": `${getFullURL(answers.instance)}/_apis/distributedtask/pools`,
      "qs": { "api-version": DISTRIBUTED_TASK_API_VERSION }
   };

   return new Promise(function (resolve, reject) {
      request(options, function (e, response, body) {
         if (e) {
            reject(e);
            return;
         }

         var obj = JSON.parse(body);
         resolve(obj.value);
      });
   });
}

module.exports = {

   // Exports the portions of the file we want to share with files that require
   // it.
   getPools: getPools,
   validateVSTS: validateVSTS,
   validatePersonalAccessToken: validatePersonalAccessToken
}