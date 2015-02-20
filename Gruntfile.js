/* jshint node: true */
module.exports = function(grunt) {
    'use strict';

    var firstAppPath = 'apps/MyWLHybridApp';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                jshintrc: true
            },
            js: {
                src: ['Gruntfile.js',
                      'adapters/**/*.js',
                      'apps/*/common/js/**/*.js',
                      'apps/*/spec/*.js']
            },
            html: {
                src: ['apps/*/common/**/*.html'],
                options: {
                    extract: 'always'
                }
            }
        },
        jasmine: {
            firstApp: {
                src: [firstAppPath + '/spec/mocks.js',
                      firstAppPath + '/common/js/**/*.js'],
                options: {
                    vendor: 'node_modules/grunt-jquery-builder/built/jquery-1.9.1.js',
                    specs: firstAppPath + '/spec/*Spec.js',
                    helpers: [firstAppPath + '/spec/*Helper.js',
                              'node_modules/jasmine-jquery/lib/jasmine-jquery.js']
                }
            }
        },
        jquery: {
            jasmine_jquery: {
                output: "node_modules/grunt-jquery-builder/built",
                versions: ["1.9.1"],
                options: {
                    prefix: "jquery-",
                    minify: false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks("grunt-jquery-builder");

    grunt.registerTask('test', ['jshint', 'jasmine']);
    grunt.registerTask('default', ['test']);

};
