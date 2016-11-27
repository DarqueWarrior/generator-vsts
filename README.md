# generator-vsts

## Build status
![](https://dlb.visualstudio.com/_apis/public/build/definitions/40202688-4713-4e5d-85ea-958146d71db6/53/badge)

## See it in action
[Ignite New Zealand 2016](https://channel9.msdn.com/Events/Ignite/New-Zealand-2016/M328)

## Capabilities
generator-vsts is a [Yeoman](http://yeoman.io/) generator that creates a complete CI/CD pipeline in [Visual Studio Team Services](https://www.visualstudio.com/vsts-test/) for the following languages:
- Java using Tiles and bootstrap
- Node using Pug and bootstrap
- ASP.net Core using Razor and bootstrap

It allows you to deploy to the following platforms:
- [Azure App Service](https://azure.microsoft.com/en-us/services/app-service/web/)
- [Docker](https://www.docker.com/)

## Requirements
- [Visual Studio Team Services Account](https://app.vsaex.visualstudio.com/profile/account)
   - Personal Access Token
   - Install [Docker Integration](https://marketplace.visualstudio.com/items?itemName=ms-vscs-rm.docker) on VSTS Account
- [Azure Subscription](https://azure.microsoft.com/en-us/free/)

## Install
You can read how to use it at [DonovanBrown.com](http://www.donovanbrown.com/post/2016/11/02/yo-vsts). 

## To test
`npm test`

## Debug
You can debug the generator using [VS Code](http://code.visualstudio.com/). You need to update the launch.json. Replace any value in [] with your information.  Use [npm link](https://docs.npmjs.com/cli/link) from the root folder to load your local version.
