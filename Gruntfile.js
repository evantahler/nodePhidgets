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

    // Push documentation to GitHub pages
    'gh-pages': {
      options: {
        base: './docs'
      },
      src: ['**/*']
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
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('publish', ['publish:patch']);
  grunt.registerTask("publish:prerelease", ['bumpup:prerelease', 'yuidoc', 'gh-pages', 'release']);
  grunt.registerTask("publish:patch", ['bumpup:patch', 'yuidoc', 'gh-pages', 'release']);
  grunt.registerTask('publish:minor', ['bumpup:minor', 'yuidoc', 'gh-pages', 'release']);
  grunt.registerTask('publish:major', ['bumpup:major', 'yuidoc', 'gh-pages', 'release']);

};
