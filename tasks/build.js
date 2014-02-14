'use strict';

module.exports = function(grunt) {


  var ph_libutil = require("phantomizer-libutil");
  var fs = require("fs");
  var path = require("path");

  // Build an url
  // ----------
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

    // get phantomizer main instance
    var Phantomizer = ph_libutil.Phantomizer;
    var phantomizer = new Phantomizer(process.cwd(),grunt);
    var router = phantomizer.get_router();

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


  // Builds a phantomizer project
  // ----------
  // builds an entire project with best performance
  // this task specifically helps to drive the build by environment
  grunt.registerMultiTask("phantomizer-project-builder",
    "Builds an entire project with best performance", function () {

      // default task options
      var options = this.options({
        // the directories to clean before the build
        clean_dir:[],
        // the grunt target to use for page optimization level
        build_target:"",
        // inject extras loader into the page
        inject_extras:false,
        //
        build_assets:false,
        // appcache support
        html_manifest:false,
        // sitemap support
        sitemap:false,
        web_domain:"",
        // minify html
        htmlcompressor:false,
        export_dir:""
      });

      var tgt_env = this.target;


      // ensure directories are clean
      var clean_dir = options.clean_dir;
      for( var n in clean_dir ){
        grunt.file.delete(clean_dir[n], {force: true})
        grunt.file.mkdir(clean_dir[n]);
        grunt.verbose.write("Directory cleaned "+clean_dir[n])
      }

      var tasks = [
      ];

      // Builds all html route and the assets contained into it
      // ------------
      // Adjust options
      var build_target = options.build_target;
      var opt = grunt.config.get("phantomizer-html-project-builder");
      if(!opt[build_target]) opt[build_target] = {};
      if(!opt[build_target].options) opt[build_target].options = {};

      // update grunt config instance
      opt[build_target].options.inject_extras = options.inject_extras;
      opt[build_target].options.build_assets = options.build_assets;
      grunt.config.set("phantomizer-html-project-builder", opt);

      tasks.push("phantomizer-html-project-builder:"+build_target);

      // copy files from many sources directories (src, wbm, vendors, dirlisting)
      // ------------
      // to export dir
      // Adjust options
      opt = grunt.config.get("phantomizer-export-build");
      if(!opt[tgt_env]) opt[tgt_env] = {};
      if(!opt[tgt_env].options) opt[tgt_env].options = {};

      // update grunt config instance
      opt[tgt_env].options.export_dir = options.export_dir;
      opt[tgt_env].options.rm_files = options.rm_files;
      opt[tgt_env].options.rm_dir = options.rm_dir;
      grunt.config.set("phantomizer-export-build", opt);

      tasks.push("phantomizer-export-build:"+tgt_env);

      // compress export dir html files
      // ------------
      if( options.htmlcompressor == true ){
        // Adjust phantomizer-dir-htmlcompressor options
        opt = grunt.config.get("phantomizer-dir-htmlcompressor");
        if(!opt[build_target]) opt[build_target] = {};
        if(!opt[build_target].options) opt[build_target].options = {};

        // apply for the current options
        opt[build_target].options.in_dir = options.export_dir+"/";

        // update grunt config instance
        grunt.config.set("phantomizer-dir-htmlcompressor", opt);

        tasks.push("phantomizer-dir-htmlcompressor:"+build_target);
      }

      // parse export dir html files, and produce a manifest
      // ------------
      if( options.html_manifest == true ){
        // Adjust phantomizer-project-manifest options
        opt = grunt.config.get("phantomizer-project-manifest");
        if(!opt[tgt_env]) opt[tgt_env] = {};
        if(!opt[tgt_env].options) opt[tgt_env].options = {};

        // apply for the current options
        opt[tgt_env].options.target_path = options.export_dir+"/";

        // update grunt config instance
        grunt.config.set("phantomizer-project-manifest", opt);

        tasks.push("phantomizer-project-manifest:"+tgt_env);
      }

      // parse export dir html files, and produce a manifest
      // ------------
      if( options.sitemap == true ){
        // Adjust phantomizer-sitemap options
        opt = grunt.config.get("phantomizer-sitemap");
        if(!opt[tgt_env]) opt[tgt_env] = {};
        if(!opt[tgt_env].options) opt[tgt_env].options = {};

        // apply for the current options
        opt[tgt_env].options.target_path = options.export_dir+"/";
        opt[tgt_env].options.base_url = options.web_domain?"http://"+options.web_domain:"";

        // update grunt config instance
        grunt.config.set("phantomizer-sitemap", opt);

        tasks.push("phantomizer-sitemap:"+tgt_env);
      }

      // invoke next tasks to run
      grunt.task.run( tasks );
    });



  // Export a phantomizer project
  // ----------
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

    grunt.log.ok("Export to "+path.relative(process.cwd(),export_dir) );

    // ensure the target directory exists
    grunt.file.mkdir( export_dir );

    // foreach paths, recursively copy files matching provided pattern
    for( var n in paths ){
      grunt.log.ok("Copy from "+path.relative(process.cwd(),paths[n]));
      for( var k in copy_patterns ){
        copy_recusive(paths[n], copy_patterns[k], export_dir);
      }
    }

    // clean up output directory
    for( var n in rm_dir ){
      grunt.log.ok("Delete directory "+path.relative(process.cwd(),rm_dir[n]));
      grunt.file.delete(rm_dir[n], {force: true})
    }
    for( var n in rm_files ){
      grunt.log.ok("Delete file "+path.relative(process.cwd(),rm_files[n]));
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