module.exports = function(grunt) {


    var wrench = require('wrench'),
        util = require('util');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        docco: {
            debug: {
                src: [
                    'tasks/build.js'
                ],
                options: {
                    layout:'linear',
                    output: 'documentation/'
                }
            }
        },
        'gh-pages': {
            options: {
                base: '.',
                add: true
            },
            src: ['documentation/**']
        }
    });
    grunt.loadNpmTasks('grunt-docco');
    grunt.loadNpmTasks('grunt-gh-pages');
    grunt.registerTask('cleanup-grunt-temp', [],function(){
        wrench.rmdirSyncRecursive(__dirname + '/.grunt', !true);
    });

    // juts run this command to generate docco doc and push on github
    // grunt
    grunt.registerTask('default', ['docco','gh-pages', 'cleanup-grunt-temp']);

};