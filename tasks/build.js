'use strict';

module.exports = function(grunt) {


    var ph_libutil = require("phantomizer-libutil");
    var fs = require("fs");
    var path = require("path");

    // <h3>Build an url</h3>
    // build provided url against a webserver
    grunt.registerTask("phantomizer-build", "", function () {

        // default options
        var options = this.options({
            // clean_dir is an array of directory path to clean before the build occurs
            clean_dir:[],
            // build_target define the optimization level to apply to the builded page
            build_target:""
        });

        var build_target    = options.build_target;
        var clean_dir       = options.clean_dir;

        // ensure directories are empty
        for( var n in clean_dir ){
            grunt.file.delete(clean_dir[n], {force: true})
            grunt.file.mkdir(clean_dir[n])
            grunt.verbose.write("Directory cleaned "+clean_dir[n])
        }

        // asynchronous task
        var done = this.async();

        // get current config, all grunt config
        var config = grunt.config.get();
        // create a new url router in order to collect urls to build
        var router_factory = ph_libutil.router;
        var router = new router_factory(config.routing)
        // eventually from a remote service
        router.load(function(){
            var urls = router.collect_urls();
            var tasks = [];
            // foreach url push a new grunt task to actually build the url
            for( var n in urls ){
                tasks.push("phantomizer-html-jitbuild:"+build_target+":"+urls[n])
            }
            // invoke the by-url build task
            grunt.task.run( tasks );
            // consume the async handler to let new tasks to run
            done();
        });
    });


    // <h3>Builds a phantomizer project</h3>
    // build an entire project with best performance
    grunt.registerMultiTask("phantomizer-project-builder", "", function () {

        // default task options
        var options = this.options({
            // the directories to clean before the build
            clean_dir:[],
            // the grunt target to use for page optimization level
            build_target:"",
            // inject extras loader into the page
            inject_extras:false
        });

        var build_target    = options.build_target;
        var inject_extras   = options.inject_extras;
        var clean_dir       = options.clean_dir;

        // ensure directories are clean
        for( var n in clean_dir ){
            grunt.file.delete(clean_dir[n], {force: true})
            grunt.file.mkdir(clean_dir[n]);
            grunt.verbose.write("Directory cleaned "+clean_dir[n])
        }

        // create a new grunt task
        var opt = grunt.config.get("phantomizer-html-project-builder");
        if(!opt[build_target]) opt[build_target] = {};
        if(!opt[build_target].options) opt[build_target].options = {};

        // apply for the current options
        opt[build_target].options.inject_extras = inject_extras;

        // update grunt config instance
        grunt.config.set("phantomizer-html-project-builder", opt);

        // invode next task to run
        grunt.task.run( ["phantomizer-html-project-builder:"+build_target] );
        // release the task now to let the new tasks execute now
    });



    // <h3>Export a phantomizer project</h3>
    // Once a phantomizer project is built, this task is able to export it
    grunt.registerMultiTask("phantomizer-export-build", "", function () {

        // default task options
        var options = this.options({
            // paths an Array(directory_path)
            paths:[],
            // copy_patterns an Array(pattern) : **/*.html
            copy_patterns:[],
            // export_dir the target directory of the delivery
            export_dir:"",
            // rm_dir the directories to clean in the export_dir
            rm_dir:[],
            // rm_file the files to clean in the export_dir
            rm_files:[]
        });

        var paths           = options.paths;
        var copy_patterns   = options.copy_patterns;
        var export_dir      = options.export_dir;
        var rm_dir          = options.rm_dir;
        var rm_files        = options.rm_files;

        grunt.log.ok("Exporting to "+export_dir );

        // ensure the target directory exists
        grunt.file.mkdir( export_dir );

        // foreach paths, recursively copy files matching provided pattern
        for( var n in paths ){
            for( var k in copy_patterns ){
                copy_recusive(paths[n], copy_patterns[k], export_dir);
            }
        }

        // clean up output directory
        for( var n in rm_dir ){
            grunt.log.ok("Deleting "+rm_dir[n]);
            grunt.file.delete(rm_dir[n], {force: true})
        }
        for( var n in rm_files ){
            grunt.log.ok("Deleting "+rm_files[n]);
            grunt.file.delete(rm_files[n])
        }
    });

// helper function
    /**
     * Search for corresponding
     * pattern file in source
     * and copy those files to output
     * @param source
     * @param pattern
     * @param output
     */
    function copy_recusive( source, pattern, output ){
        // expand source directory with pattern
        var files = grunt.file.expand({}, [source+pattern]);
        for( var n in files ){
            // get only the relative path
            var f = files[n].substring(source.length)
            if( f != "" ){
                // if the source path is a directory
                if( grunt.file.isDir(files[n]) ){
                    // create output
                    grunt.file.mkdir( output+"/"+f )
                }else{
                    // copy the file
                    var output_f = (output+"/"+f).replace("//","/")
                    grunt.file.copy(source+"/"+f, output_f)
                    grunt.verbose.ok("copying "+source+"/"+f+" "+output_f);
                }
            }
        }
    }

};