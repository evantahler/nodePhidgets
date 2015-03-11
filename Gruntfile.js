module.exports = function (grunt) {

  'use strict';

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    bumpup: {
      options: {
        updateProps: {
          pkg: 'package.json'
        }
      },
      file: 'package.json'
    },

    yuidoc: {
      compile: {
        name: '<%= pkg.name %>',
        version: '<%= pkg.version %>',
        description: '<%= pkg.description %>',
        url: '<%= pkg.url %>',
        options: {
          outdir: './docs',
          linkNatives: true,
          paths: ['./lib']
        }
      }
    },

    release: {
      options: {
        bump: false,
        commitMessage: 'Release <%= version %>'
      }
    }

  });

  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks("grunt-contrib-yuidoc");
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('publish', ['publish:prerelease']);
  grunt.registerTask("publish:prerelease", ['bumpup:prerelease', 'yuidoc', 'release']);
  grunt.registerTask("publish:patch", ['bumpup:patch', 'yuidoc', 'release']);
  grunt.registerTask('publish:minor', ['bumpup:minor', 'yuidoc', 'release']);
  grunt.registerTask('publish:major', ['bumpup:major', 'yuidoc', 'release']);

};
