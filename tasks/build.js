'use strict';

module.exports = function(grunt) {

    var fs = require("fs")

    var deleteFolderRecursive = function(path) {
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
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
                    //grunt.log.ok("copying "+source+"/"+f+" "+output_f);
                }
            }
        }
    }

    grunt.registerTask("phantomizer-build", "", function () {

        var options = this.options();
        var grunt_config = grunt.config.get();

        var build_target = options.build_target;
        var clean_dir = options.clean_dir;

        for( var n in clean_dir ){
            deleteFolderRecursive(clean_dir[n])
            grunt.file.mkdir(clean_dir[n])
        }

        var tasks = [];
        read_option_urls(options,function(urls){
            if( urls.length ==0 && grunt_config.routing ){
                urls = [];
                for( var n in grunt_config.routing ){
                    var route = grunt_config.routing[n];
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
        });
    });



    grunt.registerMultiTask("phantomizer-build2", "", function () {

        var options = this.options();

        var build_target = options.build_target;
        var clean_dir = options.clean_dir;
        var out_path = options.out_path;
        var export_dir = options.export_dir;
        var meta_dir = options.meta_dir;
        var current_target = this.target;

        for( var n in clean_dir ){
            deleteFolderRecursive(clean_dir[n])
            grunt.file.mkdir(clean_dir[n])
        }

        var tasks = [];


        read_option_urls(options,function(urls){
            queue_urls_html_build(tasks, urls, build_target);

            tasks.push('phantomizer-export-build:'+current_target);

            queue_gm_merge(tasks, current_target, [export_dir], export_dir);
            queue_img_opt_dir(tasks, current_target, [export_dir]);
            queue_css_img_merge_dir(tasks, current_target, meta_dir, [export_dir], export_dir);

            tasks.push( "throttle:100" );

            grunt.task.run( tasks );
        });
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




    function read_option_urls(options,then){
        var urls = [];
        if (options.urls_datasource){
            grunt.log.ok("Reading urls from URL "+options.urls_datasource);
            read_url(options.urls_datasource, function(status,content){
                urls = JSON.parse(content);
                then(urls);
            });
        }else if (options.urls_file){
            var content = fs.readFileSync(options.urls_file);
            grunt.log.ok("Reading urls from file "+options.urls_file);
            urls = JSON.parse(content);
            then(urls);
        }else if( options.urls ){
            grunt.log.ok("Reading urls inlined from options");
            then(options.urls);
        }else if (options.url){
            urls = [options.url];
            grunt.log.ok("Reading urls inlined from options");
            then(urls);
        }
    }
    function read_url(url,then){
        var content = "";
        http.get(url, function(res) {
            console.log("Got response: " + res.statusCode);
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                content+=chunk;
                console.log('BODY: ' + chunk);
            });
            res.on('end', function() {
                content = JSON.parse(content);
                if( then) then(true,content);
            });
        }).on('error', function(e) {
                console.log("Got error: " + e.message);
                if( then) then(false,content);
            });
    }





    function queue_urls_html_build( tasks, urls, build_target){
        grunt.file.mkdir("tmp")
        var urls_file = "tmp/urls.json";
        grunt.file.write(urls_file, JSON.stringify(urls));

        var opt = grunt.config.get("phantomizer-html-builder2");
        if(!opt[build_target]) opt[build_target] = {};
        if(!opt[build_target].options) opt[build_target].options = {};

        opt[build_target].options.urls_file = urls_file;

        grunt.config.set("phantomizer-html-builder2", opt);
        tasks.push("phantomizer-html-builder2:"+build_target)
    }
    function queue_img_opt_dir( sub_tasks, current_target, paths ){

        var jit_target = "jit"+sub_tasks.length;
        var task_name = "phantomizer-dir-imgopt";
        var task_options = grunt.config(task_name) || {};

        task_options = clone_subtasks_options(task_options, jit_target, current_target);
        if(!task_options[jit_target].options) task_options[jit_target].options = {};
        task_options[jit_target].options.paths = paths;

        sub_tasks.push( task_name+":"+jit_target );

        grunt.config.set(task_name, task_options);
    }
    function queue_css_img_merge_dir( sub_tasks, current_target, meta_dir, in_dir, out_dir ){

        var merge_options = grunt.config("phantomizer-gm-merge") || {};
        var map = merge_options.options.in_files;

        var jit_target = "jit"+sub_tasks.length;
        var task_name = "phantomizer-dir-css-imgmerge";
        var task_options = grunt.config(task_name) || {};

        task_options = clone_subtasks_options(task_options, jit_target, current_target);
        task_options[jit_target].options.paths = in_dir;
        task_options[jit_target].options.out_dir = out_dir;
        task_options[jit_target].options.meta_dir = meta_dir;
        task_options[jit_target].options.map = map;

        sub_tasks.push( task_name+":"+jit_target );

        grunt.config.set(task_name, task_options);
    }
    function queue_gm_merge( sub_tasks, current_target, paths, out_dir ){

        var jit_target = "jit"+sub_tasks.length;
        var task_name = "phantomizer-gm-merge";
        var task_options = grunt.config(task_name) || {};

        task_options = clone_subtasks_options(task_options, jit_target, current_target);

        if( !task_options[jit_target].options )
            task_options[jit_target].options = {};
        task_options[jit_target].options.paths = paths;
        task_options[jit_target].options.out_dir = out_dir;

        sub_tasks.push( task_name+":"+jit_target );

        grunt.config.set(task_name, task_options);
    }

    function clone_subtasks_options(task_options, task_name, current_target){
        var _ = grunt.util._;
        if( task_options[current_target] ) task_options[task_name] = _.clone(task_options[current_target], true);
        if( !task_options[task_name] ) task_options[task_name] = {};
        if( !task_options[task_name].options ) task_options[task_name].options = {};
        return task_options;
    }


    function find_in_paths(paths, src){
        var Path = require("path");
        for( var t in paths ){
            if( grunt.file.exists(paths[t]+src) ){
                return Path.resolve(paths[t]+src)
            }
        }
        return false
    }

};