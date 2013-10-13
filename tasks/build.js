'use strict';

module.exports = function(grunt) {


    var ph_libutil = require("phantomizer-libutil");
    var fs = require("fs")

    var deleteFolderRecursive = function(path) {
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                    grunt.verbose.ok("removed "+curPath);
                }
            });
            grunt.verbose.ok("removed "+path);
            fs.rmdirSync(path);
        }
    };
    function copy_recusive( source, pattern, output ){
        var files = grunt.file.expand({}, [source+pattern]);
        for( var n in files ){
            var f = files[n].substring(source.length)
            if( f != "" ){
                if( grunt.file.isDir(files[n]) ){
                    grunt.file.mkdir( output+"/"+f )
                }else{
                    var output_f = (output+"/"+f).replace("//","/")
                    grunt.file.copy(source+"/"+f, output_f)
                    grunt.verbose.ok("copying "+source+"/"+f+" "+output_f);
                }
            }
        }
    }

    grunt.registerTask("phantomizer-build", "", function () {

        var options = this.options();

        var build_target = options.build_target;
        var clean_dir = options.clean_dir;

        for( var n in clean_dir ){
            deleteFolderRecursive(clean_dir[n])
            grunt.file.mkdir(clean_dir[n])
        }

        var done = this.async();

        var config = grunt.config.get();
        var router_factory = ph_libutil.router;
        var router = new router_factory(config.routing)
        router.load(function(){
            var urls = router.collect_urls();
            var tasks = [];
            if( urls.length ==0 && config.routing ){
                urls = [];
                for( var n in config.routing ){
                    var route = config.routing[n];
                    if( route.urls ){
                        for(var n in route.urls ){
                            urls.push(route.urls[n])
                        }
                    }else{
                        tasks.push(route.template)
                    }
                }
            }
            for( var n in urls ){
                tasks.push("phantomizer-html-jitbuild:"+build_target+":"+urls[n])
            }
            grunt.task.run( tasks );
            done();
        });
    });


    grunt.registerTask("export-done", "", function () {
        console.log("Export done !");
    });
    grunt.registerMultiTask("phantomizer-build2", "", function () {

        var options = this.options();

        var build_target = options.build_target;
        var inject_extras = options.inject_extras;
        var clean_dir = options.clean_dir;
        var export_dir = options.export_dir;
        var built_paths = options.built_paths;
        var meta_dir = options.meta_dir;
        var current_target = this.target;

        for( var n in clean_dir ){
            deleteFolderRecursive(clean_dir[n]);
            grunt.file.mkdir(clean_dir[n]);
        }

        var done = this.async();

        var tasks = [];

        var config = grunt.config.get();
        var router_factory = ph_libutil.router;
        var router = new router_factory(config.routing);
        router.load(function(){
            var urls = router.collect_urls();
            queue_urls_html_build(tasks, urls, build_target, inject_extras);

            tasks.push('phantomizer-export-build:'+current_target);

            tasks.push( "throttle:100" );

            grunt.task.run( tasks );
            done();
        })
    });



    grunt.registerMultiTask("phantomizer-export-build", "", function () {
        var done = this.async();

        var options = this.options();

        var paths = options.paths;
        var copy_patterns = options.copy_patterns;
        var export_dir = options.export_dir;
        var rm_dir = options.rm_dir;
        var rm_files = options.rm_files;

        grunt.log.ok("exporting to "+export_dir );
        grunt.file.mkdir( export_dir );

        for( var n in paths ){
            for( var k in copy_patterns ){
                copy_recusive(paths[n], copy_patterns[k], export_dir);
            }
        }

        for( var n in rm_dir ){
            grunt.log.ok("deleting "+rm_dir[n]);
            deleteFolderRecursive(rm_dir[n]);
        }
        for( var n in rm_files ){
            grunt.log.ok("deleting "+rm_files[n]);
            if( fs.existsSync(rm_files[n]) )
                fs.unlinkSync(rm_files[n]);
        }

        done();
    });




    function queue_urls_html_build( tasks, urls, build_target, inject_extras){
        grunt.file.mkdir("tmp")
        var urls_file = "tmp/urls.json";
        grunt.file.write(urls_file, JSON.stringify(urls));

        var opt = grunt.config.get("phantomizer-html-builder2");
        if(!opt[build_target]) opt[build_target] = {};
        if(!opt[build_target].options) opt[build_target].options = {};

        opt[build_target].options.urls_file = urls_file;
        opt[build_target].options.inject_extras = inject_extras;

        grunt.config.set("phantomizer-html-builder2", opt);
        tasks.push("phantomizer-html-builder2:"+build_target)
    }

};