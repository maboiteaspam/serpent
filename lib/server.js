"use strict";

(function(exports) {

    var express = require('express');
    var fs = require('fs');
    var path = require('path');
    var nodezip = require('node-zip');
    var serpent = require('./serpent.js');
    var app = null
    var server = null

    function readJSON( file ){
        var ret = false
        if ( fs.existsSync(file) ) {
            var contents = fs.readFileSync(file);
            ret = JSON.parse(contents);
        }
        return ret
    }
    function regen(bin, args, done){
        var spawn = require('child_process').spawn,
            regen_process    = spawn(bin, args);
        var output = "";
        regen_process.stdout.on('data', function (data) {
            output+=data;
        });
        regen_process.on('close', function (code) {
            done(output, code)
        });
    }
    // # thanks # http://stackoverflow.com/a/5827895
    var fs = require('fs');
    var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) return done(null, results);
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            next();
                        });
                    } else {
                        results.push(file);
                        next();
                    }
                });
            })();
        });
    };


    var file = (function(){
        var file = {}
        // #Thanks# grunt project for grunt.file.copy
        // Read a file, optionally processing its content, then write the output.
        file.copy = function(srcpath, destpath, options) {
            if (!options) { options = {}; }
            var contents = file.read(srcpath, options);
            if (contents !== false) {
                file.write(destpath, contents, options);
            }
        };
        // Write a file.
        file.write = function(filepath, contents, options) {
            if (!options) { options = {}; }
            // var nowrite = grunt.option('no-write');
            // grunt.verbose.write((nowrite ? 'Not actually writing ' : 'Writing ') + filepath + '...');
            // Create path, if necessary.
            file.mkdir(require("path").dirname(filepath));
            try {
                fs.writeFileSync(filepath, contents);
                return true;
            } catch(e) {
                throw ('Unable to write "' + filepath + '" file (Error code: ' + e.code + ').', e);
            }
        };
        // Read a file, return its contents.
        file.read = function(filepath, options) {
            if (!options) { options = {}; }
            var contents;
            try {
                return fs.readFileSync(String(filepath)).toString();
            } catch(e) {
                // grunt.verbose.error();
                // throw grunt.util.error('Unable to read "' + filepath + '" file (Error code: ' + e.code + ').', e);
                throw ('Unable to read "' + filepath + '" file (Error code: ' + e.code + ').', e);
            }
        };
        // Like mkdir -p. Create a directory and any intermediary directories.
        file.mkdir = function(dirpath, mode) {
            //  if (grunt.option('no-write')) { return; }
            // Set directory mode in a strict-mode-friendly way.
            if (mode == null) {
                mode = parseInt('0777', 8) & (~process.umask());
            }
            dirpath.split("/").reduce(function(parts, part) {
                parts += part + '/';
                var subpath = require("path").resolve(parts);
                if (!file.exists(subpath)) {
                    try {
                        fs.mkdirSync(subpath, mode);
                    } catch(e) {
                        // throw grunt.util.error('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
                        throw ('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
                    }
                }
                return parts;
            }, '');
        };
        // True if the file path exists.
        file.exists = function() {
            var filepath = require("path").join.apply(require("path"), arguments);
            return fs.existsSync(filepath);
        };
        //
        file.readdir = function(srcpath, only) {
            if (!only) { only = ""; }

            var ret = [];
            var items = fs.readdirSync(srcpath);
            items.forEach(function(k,v){
                if( only=="dir" ){
                    try{
                        var stat = fs.statSync(srcpath+"/"+k)
                        if( stat.isDirectory() ){
                            ret.push(k)
                        }
                    }catch(ex){
                        console.log(ex)
                    }
                }else if( only=="file"){
                    try{
                        var stat = fs.statSync(srcpath+"/"+k)
                        if( stat.isFile() ){
                            ret.push(k)
                        }
                    }catch(ex){
                        console.log(ex)
                    }
                }else{
                    ret.push(k);
                }
            })

            return ret;
        };
        return file
    })();


    var invoke_phantom = function(url,wrapper,out_file,cb){
        // phantomize the page, save into index.html
        var childArgs = [
            wrapper, url, out_file
        ]
        var childProcess = require('child_process')
        var phantomjs = require('phantomjs')
        childProcess.execFile(phantomjs.path, childArgs, function(err, stdout, stderr) {
            cb(err, stdout, stderr)
        })
    };

    var do_phantomize = function(target_dir, port, cb){
        invoke_phantom(  "http://localhost:"+port+"/index.html",
            __dirname+'/../ext/wrapper.js',
            target_dir+"/index.html",
            function(err, stdout, stderr){
                if( stderr != "" ){
                    throw ("phantomjs error\n"+stderr)
                } else {
                    cb(err, stdout, stderr);
                }
            });
    };

    var copy_tree = function(path, target_dir, cb){
        file.mkdir(target_dir);
        walk(path, function(err, results) {
            if (err) throw err;
            for( var n in results ){
                var f = results[n]
                var tf = f.replace(path, target_dir)
                file.copy(f,tf)
            }
            cb();
        });
    };

    function addFileToZip(zip,basedir,filepath) {
        if(fs.lstatSync(basedir+filepath).isDirectory()) {
            console.log("  Adding folder", filepath);
            zip.folder(filepath);
            var directory = fs.readdirSync(basedir+filepath);
            directory.forEach(function(subfilepath) {
                addFileToZip(zip, basedir, path.join(filepath,subfilepath));
            });
        } else {
            console.log("  Adding file", filepath)
            console.log("  Adding file", filepath)
            zip.file(filepath, fs.readFileSync(basedir+filepath, 'binary'));
        }
    }

    exports.start = function(options){
        var port = options.port || 3000
        var www_dir = options.www_dir || __dirname+"/www/"
        var www_alternate = options.www_alternate || false
        var export_dir = options.export_dir || false
        var verbose = options.verbose || verbose
        var serpent_path = options.serpent_path

        app = express();

        // apply for logger with color, just great ;)
        app.use(express.logger({format:'dev'}));
        // apply for middleware responsible for POST parameters parsing
        app.use(express.bodyParser());

        // route to read the built configuration and services definition
        app.get('/serpent.json', function(req, res){
            var config = readJSON(serpent_path)
            if( config == false ){
                res.send(404, config);
            }else{
                config = serpent.build(config)
                res.send(config);
            }
        });

        // route to regen the services definition according to your source code
        app.get('/regen', function(req, res){
            var config = readJSON(serpent_path)
            var generator = config.generator;
            regen(generator.binary, [generator.bootstrap, serpent_path], function(output, code){
                if( verbose ){
                    console.log("Generator process output")
                    console.log(code)
                    console.log(output.replace('\n',"\n"))
                }
                req.method = 'get';
                res.redirect('/index.html');
            })
        });

        // route responsible to export your documentation given a version
        app.post('/export', function(req, res){
            var config = readJSON(serpent_path)
            var version_major = req.body.version_major;
            var version_minor = req.body.version_minor;
            var changelog = req.body.new_changelog;

            var version_target = config.export_pattern.replace("%major%",version_major).replace("%minor%",version_minor)

            var target_dir = export_dir+"/"+version_target+"/";
            var examples_path = config.paths.examples;

            var paths_to_export = [];
            if( www_alternate != false ) paths_to_export.push({src:www_alternate,tgt:target_dir})
            paths_to_export.push({src:www_dir,tgt:target_dir})
            for(var n in examples_path ) paths_to_export.push({src:examples_path[n],tgt:target_dir+"/examples/"})

            try{
                var i = 0;
                var next_export = function(cb){
                    console.log(paths_to_export[i].src +" -> "+paths_to_export[i].tgt);
                    copy_tree(paths_to_export[i].src, paths_to_export[i].tgt, function(){
                        i++;
                        if( i==paths_to_export.length){
                            cb();
                        }else{
                            next_export(cb);
                        }
                    });
                };

                next_export(function(){
                    do_phantomize(target_dir, port, function(err, stdout, stderr){
                        if( verbose ){
                            console.log("Phantom process output")
                            //console.log(stdout)
                        }
                        // write output html to index file
                        file.write(target_dir+"/changelog", changelog);
                        // zip example files
                        var zip = new nodezip();
                        addFileToZip(zip, target_dir+"/examples/", "");
                        fs.writeFileSync(target_dir+"/examples.zip", zip.generate({base64:false,compression:'DEFLATE'}), 'binary');
                        // just respond ok
                        res.send(200, "ok");
                    });
                });
            }catch( ex ){
                res.send(503, ex);
            }
        });

        // route responsible to read and list known versions of your documentation
        app.get('/versions', function(req, res){
            var config = readJSON(serpent_path)
            try{
                var versions = [
                    /*
                     {
                     name:"xx.xx",
                     date:"xxxx-xx-xx xx:xx",
                     changelog:"xxxxx \n xxxxx",
                     }
                     */
                ];
                var items = file.readdir(export_dir, "dir");

                items.forEach(function(k,v){
                    var version_pattern = config.export_pattern.replace("%major%","([a-z0-9]+)").replace("%minor%","([a-z0-9]+)")
                    var re = new RegExp(version_pattern)
                    var matches = re.exec(k);
                    if( matches.length > 1 ){
                        var version = {
                            "name":k
                            ,"major":matches[1]
                            ,"minor":matches[2]
                            ,"changelog":""
                            ,"date":""
                        }
                        if( file.exists(export_dir+"/"+k+"/changelog") ){
                            version.changelog = file.read(export_dir+"/"+k+"/changelog");
                        }
                        try{
                            var stat = fs.statSync(export_dir+"/"+k)
                            version.date = stat.mtime.toDateString();
                            version.timestamp = stat.mtime.getTime();
                        }catch(ex){
                            console.log(ex)
                        }
                        versions.push(version)
                    }
                })
                versions.sort(function(a,b) {
                    var a_major = a.major;
                    if(a.major == "alpha" ) a_major = -1;
                    if(a.major == "beta" ) a_major = 0;

                    var b_major = b.major;
                    if(b.major == "alpha" ) b_major = -1;
                    if(b.major == "beta" ) b_major = 0;

                    if( a_major != b_major ) return a_major > b_major;
                    else return a.minor > b.minor;

                } );
                res.send(200, {versions:versions});
            }catch( ex ){
                console.log(ex)
                res.send(503, ex);
            }
        });

        app.use(express.directory(www_dir))
        app.use(express.static(www_dir))

        if( www_alternate !== false ){
            app.use(express.directory(www_alternate))
            app.use(express.static(www_alternate))
        }

        server = app.listen(port);
    };
}(typeof exports === 'object' && exports || this));

