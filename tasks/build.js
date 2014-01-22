'use strict';

module.exports = function(grunt) {


    var ph_libutil = require("phantomizer-libutil");
    var fs = require("fs");
    var path = require("path");

    grunt.registerTask("phantomizer-build", "", function () {

        // default options
        // clean_dir is an array of directory path to clean before the build occurs
        // build_target define the optimization level to apply to the builded page
        var options = this.options({
            clean_dir:[],
            build_target:""
        });

        var build_target    = options.build_target;
        var clean_dir       = options.clean_dir;

        // ensure directories are empty
        for( var n in clean_dir ){
            grunt.file.delete(clean_dir[n], {force: true})
            grunt.file.mkdir(clean_dir[n])
            grunt.log.verbose("Directory cleaned "+clean_dir[n])
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
            /*
             //
             if( urls.length ==0 && config.routing ){
             urls = [];
             for( var n in config.routing ){
             var route = config.routing[n];
             if( route.urls ){
             for(var n in route.urls ){
             urls.push(route.urls[n])
             }
             }else{
             urls.push(route.template)
             }
             }
             }
             */
            // foreach url push a new grunt task to actually build the url
            for( var n in urls ){
                tasks.push("phantomizer-html-jitbuild:"+build_target+":"+urls[n])
            }
            grunt.task.run( tasks );
            // consume the async handler to let new tasks to run
            done();
        });
    });


    // register a task to print end of the process
    grunt.registerTask("export-done", "", function () {
        console.log("Export done !");
    });
    grunt.registerMultiTask("phantomizer-build2", "", function () {

        // default task options
        // the directories to clean before the build
        // the temporary file to use for urls recording
        // inject extras loader into the page
        var options = this.options({
            clean_dir:[],
            build_target:"",
            urls_file:"tmp/urls.json",
            inject_extras:false
        });

        var build_target    = options.build_target;
        var urls_file       = options.urls_file;
        var inject_extras   = options.inject_extras;
        var clean_dir       = options.clean_dir;

        // ensuer directories are clean
        for( var n in clean_dir ){
            grunt.file.delete(clean_dir[n], {force: true})
            grunt.file.mkdir(clean_dir[n]);
            grunt.log.verbose("Directory cleaned "+clean_dir[n])
        }

        // asynchronous task
        var done = this.async();

        // initialize the router given the grunt config.routing key
        var config = grunt.config.get();
        var router_factory = ph_libutil.router;
        var router = new router_factory(config.routing);
        // load urls eventually from a remote service
        router.load(function(){

            var urls = router.collect_urls();

            // create the temp directory
            grunt.file.mkdir( path.dirname(urls_file) );
            // write urls file to a temp file
            grunt.file.write(urls_file, JSON.stringify(urls));

            // create a new grunt task
            var opt = grunt.config.get("phantomizer-html-builder2");
            if(!opt[build_target]) opt[build_target] = {};
            if(!opt[build_target].options) opt[build_target].options = {};

            opt[build_target].options.urls_file = urls_file;
            opt[build_target].options.inject_extras = inject_extras;

            // update grunt config instance
            grunt.config.set("phantomizer-html-builder2", opt);

            grunt.task.run( ["phantomizer-html-builder2:"+build_target] );
            // release the task to let the new tasks execute now
            done();
        })
    });



    grunt.registerMultiTask("phantomizer-export-build", "", function () {

        // default task options
        // paths an Array(directory_path)
        // copy_patterns an Array(pattern) : **/*.html
        // export_dir the target directory of the delivery
        // rm_dir the directories to clean in the export_dir
        // rm_file the files to clean in the export_dir
        var options = this.options({
            paths:[],
            copy_patterns:[],
            export_dir:"",
            rm_dir:[],
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
            if( fs.existsSync(rm_files[n]) ){
                grunt.log.ok("Deleting "+rm_files[n]);
                fs.unlinkSync(rm_files[n]);
            }
        }
    });


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