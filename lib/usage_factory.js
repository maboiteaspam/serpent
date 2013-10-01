(function(exports) {


    function make_data(params){
        var data = ""
        for( var n in params ){
            var v = params[n].example || params[n].default || ""
            if(v.substr ) v = "'"+v+"'"
            else if(v === false) v = "false"
            else if(v === true) v = "true"
            if( data != "" ) n = ","+n
            data += "            "+n+": "+v+"\n"
        }
        return data
    }



    var UsageFactory = function(){}
    UsageFactory.prototype.zepto = function(route, method, url, data_type, params){
        var data = ""
        if( method == "POST" ){
            var post = params.POST || {}
            var post_params = post.properties || {}
            data = make_data( post_params )
        }

        var template = "";
        template+= "$.ajax({"+"\n"
        template+= "    type: '"+method+"'"+"\n"
        template+= "    ,url: '"+url+"'"+"\n"
        if( data != "" ){
            template+= "    ,data: {"+"\n"
            template+= data+"\n"
            template+= "    }"+"\n"
        }
        if( data_type != false )
            template+= "    ,dataType: '"+data_type+"'"+"\n"
        template+= "    ,timeout: 300"+"\n"
        template+= "    ,success: function(data){"+"\n"
        template+= "        console.log(data)"+"\n"
        template+= "    }"+"\n"
        template+= "    ,error: function(xhr, type){"+"\n"
        template+= "        alert('Ajax error!')"+"\n"
        template+= "    }"+"\n"
        template+= "})"
        return template
    }
    UsageFactory.prototype.jquery = function(route, method, url, data_type, params){
        var data = ""
        if( method == "POST" ){
            var post = params.POST || {}
            var post_params = post.properties || {}
            data = make_data( post_params )
        }

        var template = "";
        template+= "$.ajax({"+"\n"
        template+= "    url: '"+url+"'"+"\n"
        if( data != "" ){
            template+= "    ,data: {"+"\n"
            template+= data+"\n"
            template+= "    }"+"\n"
        }
        template+= "    ,success: function:(data){"+"\n"
        template+= "        console.log(data)"+"\n"
        template+= "    }"+"\n"
        if( data_type != false )
            template+= "    ,dataType: '"+data_type+"'"+"\n"
        template+= "}, function() {"+"\n"
        template+= "    alert('success');"+"\n"
        template+= "})"+"\n"
        template+= ".done(function() { alert('second success'); })"+"\n"
        template+= ".fail(function() { alert('error'); })"+"\n"
        template+= ".always(function() { alert('finished'); });"
        return template
    }
    UsageFactory.prototype.curl = function(route, method, url, data_type, params){
        if( method == "POST" ){
            var post = params.POST || {}
            var post_params = post.properties || {}
            var data_str = ""
            for( var n in post_params ){
                var v = post_params[n].example || ""
                data_str += n+"="+v+"&"
            }
            data_str = encodeURIComponent(data_str)
        }

        var template = "";
        template += "curl";
        if( method == "POST" ){
            template += " -d \""+data_str+"\"";
        }
        template += " "+url;
        return template
    }
    UsageFactory.prototype.php = function(route, method, url, data_type, params){
        if( method == "POST" ){
            var post = params.POST || {}
            var post_params = post.properties || {}
            var data_str = ""
            for( var n in post_params ){
                var v = post_params[n].example || ""
                data_str += n+"="+v+"&"
            }
            data_str = encodeURIComponent(data_str)
        }

        var template = "";
        template += "$ch = curl_init();"+"\n"
        template += "curl_setopt($ch, CURLOPT_URL, \""+url+"\");"+"\n"
        template += "curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);"+"\n"
        template += "curl_setopt($ch, CURLOPT_HEADER, FALSE);"+"\n"
        if( method == "POST" ){
            template += "curl_setopt($ch, CURLOPT_POST, TRUE);"+"\n"
            template += "curl_setopt($ch, CURLOPT_POSTFIELDS, '"+data_str+"');"+"\n"
        }
        template += ""+"\n"
        template += "$response = curl_exec($ch);"+"\n"
        template += ""+"\n"
        template += "curl_close($ch);"+"\n"
        template += ""+"\n"
        template += "var_dump($response);"+"\n"
        return template
    }
    UsageFactory.prototype.python = function(route, method, url, data_type, params){
        //-
        var data = {}
        if( method == "POST" ){
            var post = params.POST || {}
            var post_params = post.properties || {}
            data = make_data( post_params )
        }

        var template = "";
        return template
    }
    UsageFactory.prototype.ruby = function(route, method, url, data_type, params){
        var data = {}
        if( method == "POST" ){
            var post = params.POST || {}
            var post_params = post.properties || {}
            data = make_data( post_params )
        }

        var template = "";
        return template
    }


    exports.UsageFactory = UsageFactory;

}(typeof exports === 'object' && exports || this));

