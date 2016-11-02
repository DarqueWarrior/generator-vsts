const assert = require('assert');
const webdriver = require('selenium-webdriver');

// If you don't use test strange things happen with 
// test execution.
const test = require('selenium-webdriver/testing');

test.describe('UITest', function () {
   // UI Test take longer
   this.timeout(30000);

   test.it('walk links should work', function (done) {
      // Arrange
      var driver = new webdriver.Builder()
         .forBrowser('chrome')
         .build();

      // Act
      driver.get('<%= testURL %>');
      driver.findElement(webdriver.By.linkText('About')).click();
      driver.findElement(webdriver.By.linkText('Contact')).click();
      driver.findElement(webdriver.By.linkText('Home')).click().then(function () {
         driver.quit();
         done();
      });
   });
});