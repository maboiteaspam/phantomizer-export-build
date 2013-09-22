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
        if( options.urls ){
            for( var n in options.urls ){
                tasks.push("phantomizer-html-jitbuild:"+build_target+":"+options.urls[n])
            }
        }else if (grunt_config.routing){
            for( var n in grunt_config.routing ){
                var route = grunt_config.routing[n];
                var url = route.template;
                tasks.push("phantomizer-html-jitbuild:"+build_target+":"+url)
            }
        }
        grunt.task.run( tasks );

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
                grunt.log.ok("copying "+paths[n]+""+copy_patterns[n]);
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

};