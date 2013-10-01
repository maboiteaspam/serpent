

// phantomizer is a function queuer
// that can skip some calls depending on the status of
// window.phantomized

// declare only once
if( ! phantomizer ){
    //
    var phantomizer = (function(){
        // search for global variables to guess which mode is running
        var phantomized = window.phantomized || false;
        var phantomized_ejs = window.phantomized_ejs || {};

        var queuer = function(){}
        // give a queue, list handlers to execute
        queuer.prototype.items = []
        // queue an handler, rendered only if window.phantomized=false
        queuer.prototype.render_static = function(handler){
            this.items.push({'type':'static','handler':handler})
        }
        // queue an handler, always rendered
        queuer.prototype.render = function(handler){
            this.items.push({'type':'dynamic','handler':handler})
        }
        // call it when you finished to build your queue
        queuer.prototype.done = function(){
            if( this.items.length == 0 ){

                if( !document.getElementById("phantom_proof") ){
                    var s = document.createElement("script")
                    s.setAttribute("id", "phantom_proof")

                    var st = "\n"
                    st += "window.phantomized = true;\n";
                    //st += "window.phantomized_ejs = {};\n";
                    for( var name in phantomized_ejs ){
                        st += "window.phantomized_ejs['"+name+"']="+phantomized_ejs[name]+";\n";
                    }
                    st = st.replace("<"+"/script>", "<\\/script>")
                    s.innerHTML = st
                    var tgt_script = document.getElementsByTagName("script")[0];
                    tgt_script.parentNode.insertBefore(s,tgt_script)
                }

            }else{
                // next iterate to the next element, to call when your handler is ready to pass
                var next = (function(ph){return function(){return ph.done();}})(this)
                var item = this.items.shift();
                if( item.type == 'static' ){
                    phantomized ?
                        next() : // just pass without executing handler
                        item.handler(next); // pass next to handler and let him manage next iteration
                }else{
                    item.handler(next); // pass next to handler and let him manage next iteration
                }
            }
        }

        return {queue: new queuer() };
    })();
}
