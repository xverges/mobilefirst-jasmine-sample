/* jshint node: true */
module.exports = function(grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
        options: {
            jshintrc: true
        },
        all: ['Gruntfile.js', 'adapters/**/*.js', 'apps/*/common/js/**/*.js']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
};
