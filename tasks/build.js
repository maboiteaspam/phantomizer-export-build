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

        var options = this.options()

        var urls = options.urls
        var build_target = options.build_target
        var clean_dir = options.clean_dir

        for( var n in clean_dir ){
            deleteFolderRecursive(clean_dir[n])
            grunt.file.mkdir(clean_dir[n])
        }

        var tasks = []
        for( var n in urls ){
            tasks.push("phantomizer-html-jitbuild:"+build_target+":"+urls[n])
        }
        grunt.task.run( tasks );

    });

    grunt.registerTask("phantomizer-export-build", "", function () {
        var done = this.async();

        var options = this.options()

        var paths = options.paths
        var build_dir = options.out_dir
        var export_dir = options.export_dir
        var rm_dir = options.rm_dir
        var rm_files = options.rm_files

        grunt.file.mkdir( export_dir )

        for( var n in paths ){
            copy_recusive(paths[n], "**/*.html", export_dir)
            copy_recusive(paths[n], "**/*.htm", export_dir)

            copy_recusive(paths[n], "**/*.js", export_dir)
            copy_recusive(paths[n], "**/*.css", export_dir)

            copy_recusive(paths[n], "**/*.jpeg", export_dir)
            copy_recusive(paths[n], "**/*.jpg", export_dir)
            copy_recusive(paths[n], "**/*.png", export_dir)
            copy_recusive(paths[n], "**/*.gif", export_dir)

            copy_recusive(paths[n], "**/*.pdf", export_dir)

            copy_recusive(paths[n], "**/*.xml", export_dir)
            copy_recusive(paths[n], "**/*.json", export_dir)
            copy_recusive(paths[n], "**/*.jsonp", export_dir)
        }


        for( var n in rm_dir ){
            deleteFolderRecursive(rm_dir[n])
        }
        for( var n in rm_files ){
            if( fs.existsSync(rm_files[n]) )
                fs.unlinkSync(rm_files[n])
        }

        done();
    });

};