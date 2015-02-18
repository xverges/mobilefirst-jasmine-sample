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
            all: ['Gruntfile.js', 
                  'adapters/**/*.js', 
                  'apps/*/common/js/**/*.js',
                  'apps/*/spec/*.js']
        },
        jasmine: {
            firstApp: {
                src: [firstAppPath + '/spec/mocks.js',
                      firstAppPath + '/common/js/**/*.js'],
                options: {
                    specs: firstAppPath + '/spec/*Spec.js',
                    helpers: firstAppPath + '/spec/*Helper.js'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('test', ['jshint', 'jasmine']);
    grunt.registerTask('default', ['test']);

};
