/*global phantom:false, require:false, console:false, window:false, QUnit:false */
/*jshint camelcase: false*/

(function() {
  'use strict';

  var url, page, timeout, junitReportPath,
    args = require('system').args;

  // arg[0]: scriptName, args[1...]: arguments
  if (args.length < 2 || args.length > 4) {
    console.error('Usage:\n  phantomjs(.exe) [path-to-phantom-qunit-js] [url-of-your-qunit-testsuite] [junit-output-directory-path] [timeout-in-seconds]');
    phantom.exit(1);
  }

  url = args[1];
  page = require('webpage').create();
  junitReportPath = args[2] || 'target/surefire-reports';
  if (args[3] !== undefined) {
    timeout = parseInt(args[3], 10);
  }

  phantom.onError = function(msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg];
    if (trace && trace.length) {
      msgStack.push('TRACE:');
      trace.forEach(function(t) {
        msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
      });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
  };

  page.onError = function(msg, trace) {
    var msgStack = ['PAGE ERROR: ' + msg];
    if (trace && trace.length) {
      msgStack.push('TRACE:');
      trace.forEach(function(t) {
        msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
      });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
  };

  // Route `console.log()` calls from within the Page context to the main Phantom context (i.e. current `this`)
  page.onConsoleMessage = function(msg) {
    var msgJSON;
    if (msg.lastIndexOf('{"exitPhantom', 0) === 0) {
      msgJSON = JSON.parse(msg);
      console.log('RUN RESULTS:  Passed: ' + msgJSON.results.passed + ' Failed: ' + msgJSON.results.failed + ' Total: ' + msgJSON.results.total + ' Time(ms): ' + msgJSON.results.time);
      if (msgJSON.results.failed > 0) {
        console.log('TEST FAILED.  Visit \'' + url + '\' in your favorite browser to debug it.');
      }
      var exitCode = (msgJSON.results.failed > 0) ? 1 : 0;
      phantom.exit(exitCode);
    }
    if (msg.lastIndexOf('{"results"', 0) === 0) {
      var fs = require('fs');
      msgJSON = JSON.parse(msg);
      var arr = url.split(fs.separator);
      var filename = arr.pop();
      var pathsegment = arr.pop();

      // generate the JUnit output filename so no file clobbering will happen in build-one-report case
      var absWorkingDir = fs.workingDirectory.substring(0, fs.workingDirectory.lastIndexOf(fs.separator));
      var relativeTestDir = junitReportPath.substring(absWorkingDir.length + 1);
      var mavenModule = relativeTestDir.substring(0, relativeTestDir.indexOf(fs.separator));

      var outputFile = junitReportPath + fs.separator + 'TEST-JavaScript-' + mavenModule.replace(/[^a-z0-9]/gi, '_') + '-' + pathsegment + '-' + filename.substring(0, filename.lastIndexOf('.')) + '-' + msgJSON.results.moduleName.replace(/[^a-z0-9]/gi, '_') + '.xml';
      fs.write(outputFile, msgJSON.xml, 'w');
      console.log('MODULE RESULTS:  Passed: ' + msgJSON.results.passed + ' Failed: ' + msgJSON.results.failed + ' Total: ' + msgJSON.results.total + ' Time(ms): ' + msgJSON.results.runtime);
      var moduleReportDir = fs.absolute(outputFile);
      if (moduleReportDir.indexOf(absWorkingDir) === 0) {
        moduleReportDir = moduleReportDir.substring(absWorkingDir.length + 1);
      }
      console.log('MODULE REPORT:  ' + moduleReportDir);
    } else {
      console.log(msg);
    }
  };

  page.onInitialized = function() {
    page.evaluate(addLogging);
  };

  page.onCallback = function(message) {
    var result,
      failed;

    if (message) {
      if (message.name === 'QUnit.done') {
        result = message.data;
        failed = !result || !result.total || result.failed;

        if (!result.total) {
          console.error('No tests were executed. Are you loading tests asynchronously?');
        }

        phantom.exit(failed ? 1 : 0);
      }
    }
  };

  page.open(url, function(status) {
    if (status !== 'success') {
      console.error('Unable to access url: ' + status);
      phantom.exit(1);
    } else {
      // Cannot do this verification with the 'DOMContentLoaded' handler because it
      // will be too late to attach it if a page does not have any script tags.
      var qunitMissing = page.evaluate(function() {
        return (typeof QUnit === 'undefined' || !QUnit);
      });
      if (qunitMissing) {
        console.error('The `QUnit` object is not present on this page.');
        phantom.exit(1);
      }

      // Set a timeout on the test running, otherwise tests with async problems will hang forever
      if (typeof timeout === 'number') {
        setTimeout(function() {
          console.error('The specified timeout of ' + timeout + ' seconds has expired. Aborting...');
          phantom.exit(1);
        }, timeout * 1000);
      }

      // Do nothing... the callback mechanism will handle everything!
    }
  });

  function addLogging() {
    window.document.addEventListener('DOMContentLoaded', function() {

      var currentRun, currentModule, currentTest, assertCount;

      QUnit.jUnitReport = function(report) {
        console.log(JSON.stringify(report));
      };

      QUnit.begin(function() {
        currentRun = {
          modules: [],
          total: 0,
          passed: 0,
          failed: 0,
          start: new Date(),
          time: 0
        };
      });

      QUnit.moduleStart(function(data) {
        console.log('\nSTARTING MODULE: ' + data.name);
        currentModule = {
          name: data.name,
          tests: [],
          total: 0,
          passed: 0,
          failed: 0,
          start: new Date(),
          time: 0,
          stdout: [],
          stderr: []
        };

        currentRun.modules.push(currentModule);
      });

      QUnit.testStart(function(data) {
        // Setup default module if no module was specified
        if (!currentModule) {
          currentModule = {
            name: data.module || 'default',
            tests: [],
            total: 0,
            passed: 0,
            failed: 0,
            start: new Date(),
            time: 0,
            stdout: [],
            stderr: []
          };

          currentRun.modules.push(currentModule);
        }

        // Reset the assertion count
        assertCount = 0;

        currentTest = {
          name: data.name,
          failedAssertions: [],
          total: 0,
          passed: 0,
          failed: 0,
          start: new Date(),
          time: 0
        };

        currentModule.tests.push(currentTest);
      });

      QUnit.log(function(data) {
        assertCount++;

        // Ignore passing assertions
        if (!data.result) {
          currentTest.failedAssertions.push(data);
        }
        currentModule.stdout.push('[' + currentModule.name + ', ' + currentTest.name + ', ' + assertCount + '] ' + data.message);
      });

      QUnit.testDone(function(data) {
        currentTest.time = (new Date()).getTime() - currentTest.start.getTime(); // ms
        currentTest.total = data.total;
        currentTest.passed = data.passed;
        currentTest.failed = data.failed;

        currentTest = null;
      });

      QUnit.moduleDone(function(data) {
        currentModule.time = data.runtime = (new Date()).getTime() - currentModule.start.getTime(); // ms
        currentModule.total = data.total;
        currentModule.passed = data.passed;
        currentModule.failed = data.failed;

        generateReport(data, currentModule);

        currentModule = null;
      });

      QUnit.done(function(data) {
        currentRun.time = data.runtime || ((new Date()).getTime() - currentRun.start.getTime()); // ms
        currentRun.total = data.total;
        currentRun.passed = data.passed;
        currentRun.failed = data.failed;

        console.log(JSON.stringify({exitPhantom: true, results: currentRun}));
      });

      var generateReport = function(results, module) {

        var convertMillisToSeconds = function(ms) {
          return Math.round(ms * 1000) / 1000000;
        };

        var xmlEncode = function(text) {
          var baseEntities = {
            '"': '&quot;',
            '\'': '&apos;',
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;'
          };

          return ('' + text).replace(/[<>&\"\']/g, function(chr) {
            return baseEntities[chr] || chr;
          });
        };

        var XmlWriter = function(settings) {
          settings = settings || {};

          var data = [],
            stack = [],
            lineBreakAt;

          var addLineBreak = function(name) {
            if (lineBreakAt[name] && data[data.length - 1] !== '\n') {
              data.push('\n');
            }
          };

          lineBreakAt = (function(items) {
            var i, map = {};
            items = items || [];

            i = items.length;
            while (i--) {
              map[items[i]] = {};
            }
            return map;
          })(settings.linebreak_at);

          this.start = function(name, attrs, empty) {
            if (!empty) {
              stack.push(name);
            }

            data.push('<' + name);

            for (var aname in attrs) {
              if (true) {  // filter unwanted properties from the prototype
                data.push(' ' + xmlEncode(aname) + '="' + xmlEncode(attrs[aname]) + '"');
              }
            }

            data.push(empty ? ' />' : '>');
            addLineBreak(name);
          };

          this.end = function() {
            var name = stack.pop();
            addLineBreak(name);
            data.push('</' + name + '>');
            addLineBreak(name);
          };

          this.text = function(text) {
            data.push(xmlEncode(text));
          };

          this.cdata = function(text) {
            data.push('<![CDATA[' + text + ']]>');
          };

          this.comment = function(text) {
            data.push('<!--' + text + '-->');
          };
          this.pi = function(name, text) {
            data.push('<?' + name + (text ? ' ' + text : '') + '?>\n');
          };

          this.doctype = function(text) {
            data.push('<!DOCTYPE' + text + '>\n');
          };

          this.getString = function() {
            while (stack.length) {
              this.end(); // internally calls `stack.pop();`
            }
            return data.join('').replace(/\n$/, '');
          };

          this.reset = function() {
            data.length = 0;
            stack.length = 0;
          };

          // Start by writing the XML declaration
          this.pi(settings.xmldecl || 'xml version="1.0" encoding="UTF-8"');
        };


        // Generate JUnit XML report!
        // var m, mLen, module, t, tLen, test, a, aLen, assertion, isEmptyElement,
        var t, tLen, test, a, aLen, assertion,
          xmlWriter = new XmlWriter({
            linebreak_at: ['testsuites', 'testsuite', 'testcase', 'failure', 'properties', 'property', 'system-out', 'system-err']
          });

          results.moduleName = module.name;

          var testsuitesName = (window && window.location && window.location.href) || 'UNKNOWN';

          var arr = testsuitesName.split('/');
          var filename = arr.pop();
          filename = filename.substring(0, filename.lastIndexOf('.'));
          var pathsegment = arr.pop();
          var testsuiteName = 'JavaScript ' + pathsegment + ' :: ' + filename + ' :: ' + module.name;

          xmlWriter.start('testsuite', {
            name: testsuiteName, //module.name,
            tests: module.total,
            failures: module.failed,
            errors: 0,
            time: convertMillisToSeconds(module.time) // ms → sec
          });

          xmlWriter.start('properties');
          xmlWriter.start('property', {
            name: 'url',
            value: (window && window.location && window.location.href) || null,
          }, true);  // property
          xmlWriter.end();  // 'properties'

          for (t = 0, tLen = module.tests.length; t < tLen; t++) {
            test = module.tests[t];

            xmlWriter.start('testcase', {
              name: test.name,
              classname: test.name,
              tests: test.total,  // not junit schema compliant
              failures: test.failed,  // not junit schema compliant
              errors: 0,
              time: convertMillisToSeconds(test.time), // ms → sec
            });

            for (a = 0, aLen = test.failedAssertions.length; a < aLen; a++) {
              assertion = test.failedAssertions[a] || {};

              // isEmptyElement = assertion && !(assertion.actual && assertion.expected);

              var failureMessage = assertion.message;
              if (typeof assertion.expected !== 'undefined') {
                failureMessage += '\nExpected: ' + assertion.expected;
              }
              if (typeof assertion.actual !== 'undefined') {
                failureMessage += '\nActual: ' + assertion.actual;
              }
              var url = ((window && window.location && window.location.href) || 'file:///[UNKNOWN URL]');
              failureMessage += '\n\nVisit \'' + url.substring(8) + '\' in your favorite browser to debug it.';

              xmlWriter.start('failure', {
                type: 'QUnit assertion failure'
              });
              xmlWriter.text(failureMessage);
              xmlWriter.end();  // 'failure'

            }

            xmlWriter.end(); //'testcase'
          }

          // Per-module stdout
          if (module.stdout && module.stdout.length) {
            xmlWriter.start('system-out');
            xmlWriter.cdata('\n' + module.stdout.join('\n') + '\n');
            xmlWriter.end(); //'system-out'
          }

          // Per-module stderr
          if (module.stderr && module.stderr.length) {
            xmlWriter.start('system-err');
            xmlWriter.cdata('\n' + module.stderr.join('\n') + '\n');
            xmlWriter.end(); //'system-err'
          }

          xmlWriter.end(); //'testsuite'

          // Invoke the user-defined callback
          QUnit.jUnitReport({
            results: results,
            xml: xmlWriter.getString()
          });
        // }
      };

    });
  }

})();