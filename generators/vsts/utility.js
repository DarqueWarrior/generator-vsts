String.prototype.replaceAll = function (search, replacement) {
   var target = this;
   return target.split(search).join(replacement);
};

function tokenize(input, nvp) {
   for (var key in nvp) {
      input = input.replaceAll(key, nvp[key]);
   }

   return input;
}

//
// Exports the portions of the file we want to share with files that require 
// it.
//
module.exports = {
   tokenize: tokenize
};