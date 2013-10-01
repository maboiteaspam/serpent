
var page = require("webpage").create();
system = require("system");
var target_url = system.args[1];
var target_file = system.args[2];

var args = require('system').args;

page.open(target_url, function (b) {
    "success" !== b ? (console.log("Unable to access network"), phantom.exit()) : window.setInterval(function () {
        var done = page.evaluate(function (c) {
            var tgt_html = document.getElementsByTagName("html")[0];
            var c = tgt_html.setAttribute("class") || ""
            tgt_html.setAttribute("class", c+ " phantomized")
            return document.getElementById("phantom_proof")!=null;
        });
        if( done ){
            var fs = require('fs');
            try {
                fs.write(target_file, page.content, 'w');
            } catch(e) {
                console.log(e);
            }
            phantom.exit();
        }
    }, 200)
});

