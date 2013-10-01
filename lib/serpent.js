
(function(exports) {

    var express = require('express');
    var fs = require('fs');
    var path = require('path');
    var _ = require('underscore');
    var UsageFactory = require('./usage_factory.js').UsageFactory;

    UsageFactory = new UsageFactory();


    function get_services(domains){
        var retour = []
        for( var d_name in domains ){
            var domain = domains[d_name]
            for( var j in domain.services ){
                retour.push(domain.services[j])
            }
        }
        return retour
    }

    function make_url(params_by_methods, route, with_url_params){
        var get_ = params_by_methods.GET || {}
        var get_params = get_.properties || {}
        var url_ = params_by_methods.URL || {}
        var url_params = url_.properties || {}

        var url = route
        var sorted_params = _.keys(url_params).sort(function(a,b){return b.length - a.length})

        for( var n in sorted_params ){
            var param_name = sorted_params[n]
            var param_ex = url_params[param_name].example || ""
            url = url.replace(":"+param_name, param_ex )
        }
        if( with_url_params ){
            url += "?"
            for( var n in get_params ){
                url = n+"="+ (get_params[n].example || "") +"&"
            }
            url = url.substr(0,url.length-1)
        }
        return url
    }

    function readJSON( file ){
        var ret = false
        if ( fs.existsSync(file) ) {
            var contents = fs.readFileSync(file);
            try{
                ret = JSON.parse(contents);
            }catch(ex){
                if( contents.toString() != "" ){
                    console.log(contents.toString())
                    throw ("wrong json content found in "+file);
                }
            }
        }
        return ret
    }

    function walk(dir) {
        var results = [];
        var list = fs.readdirSync(dir);

        for( var i=0;i<list.length;i++){
            var file = list[i];
            file = dir + '/' + file;
            try{
                var stat = fs.statSync(file)
                if ( stat.isDirectory()) {
                    results  = results.concat( walk(file) );
                } else {
                    results.push(file);
                }
            }catch(ex){
                console.log(ex)
            }
        }

        return results
    };

    function init_config(config){
        var data = {
            "title":config.title
            ,"theme":config.theme
            ,"contacts":config.contacts || {}
            ,"used_framework":config.used_framework || {}
            ,"common_params":{ }
            ,"common_models":{ }
            ,"common_examples":{ }
            ,"domains":{ }
        }
        if( config.paths.params ){
            var common_params = readJSON(config.paths.params)
            if( common_params !== false )
                data.common_params = common_params
        }
        if( config.paths.models ){
            for( var n in config.paths.models ){
                var dir_model = config.paths.models[n]
                var results = walk(dir_model)
                for( var n in results ){
                    var src = results[n].substr(dir_model.length+1)
                    data.common_models[src] = readJSON(results[n])
                }
            }
        }
        if( config.paths.examples ){
            for( var n in config.paths.examples ){
                var dir_model = config.paths.examples[n]
                var results = walk(dir_model)
                for( var n in results ){
                    var src = results[n].substr(dir_model.length+1)
                    data.common_examples[src] = readJSON(results[n])
                }
            }
        }
        if( config.paths.domains ){
            for( var n in config.paths.domains ){
                var dir_model = config.paths.domains[n]
                var results = walk(dir_model)
                for( var n in results ){
                    var src = results[n].substr(dir_model.length+1)
                    data.domains[src] = readJSON(results[n])
                }
            }
        }
        return data
    }
    function resolve_examples(common_models, common_examples){
        for(var n in common_examples ){
            resolve_example(common_examples[n], common_models, common_examples)
        }
    }
    function resolve_example(example, common_models, common_examples){
        var ref_model = null
        for( var key in example ){
            if ( key == "$model" ) {
                ref_model = model_to_example( common_models[example[key]] )
                break;
            }
        }
        if( ref_model != null ){
            delete example["$model"]
            for(var n in ref_model ){
                if( !example[n] ){
                    example[n] = ref_model[n]
                }else if(typeof example[n] === 'object'  && !example[n].length){
                    _.extend(example[n], ref_model[n])
                }
            }
        }
        var ref_example = null
        for( var key in example ){
            if ( key == "$ref" ) {
                ref_example = common_examples[example[key]]
                break;
            }
        }
        if( ref_example != null ){
            delete example["$ref"]
            for(var n in ref_example ){
                if( !example[n] ){
                    example[n] = ref_example[n]
                }else if(typeof example[n] === 'object'  && !example[n].length){
                    _.extend(example[n], ref_example[n])
                }
            }
        }
    }
    function model_to_example( model ){
        var ret = null
        var type = model.type || false
        if( type == "object" ){
            ret = model.default || {}
            for( var n in model.properties ){
                ret[n] = null
                var c_m = model.properties[n]
                if( c_m.default != undefined ){
                    ret[n] = c_m.default
                }else if( c_m.type && c_m.type == "object"){
                    ret[n] = c_m.default || model_to_example( c_m )
                }
            }
        }else if( type == "array" ){
            if( model.default != undefined )
                ret = model.default
        }else{
            if( model.default != undefined )
                ret = model.default
        }
        return ret
    }
    function resolve_models(models){
        if(typeof models === 'object'  && !models.length){
            return resolve_model(models)
        }
        for(var n in models ){
            resolve_model(models[n], models)
        }
    }
    function resolve_model(model, references){
        var ref_model = null
        for( var key in model ){
            if ( key == "$ref" ) {
                ref_model = references[model[key]]
                break;
            }
        }
        if( ref_model != null ){
            delete model["$ref"]
            for(var n in ref_model ){
                if( !model[n] ){
                    model[n] = ref_model[n]
                }
            }
        }
    }
    function apply_common_parameters(domains, common_parameters){
        var services = get_services(domains)
        for(var j in services ){ var service = services[j]
            // look for params bind to routes
            for(var route in services[j].routes ){
                var route_data = services[j].routes[route]
                for(var meth in route_data.params_by_method ){
                    var params = route_data.params_by_method[meth];
                    for( var p_name in params ){
                        if( p_name.indexOf("@") == 0 ){
                            var r_p_name = p_name.substr(1)
                            if( common_parameters[r_p_name] ){
                                service.params[r_p_name] = {}
                                for( var t in service.params[p_name] ){
                                    service.params[r_p_name][t] = service.params[p_name][t]
                                }
                                delete service.params[p_name]
                                for( var t in common_parameters[r_p_name] ){
                                    if( ! service.params[r_p_name][t] ){
                                        service.params[r_p_name][t] = common_parameters[r_p_name][t]
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // -
        }
    }
    function apply_usages(domains, used_frameworks){
        var services = get_services(domains)
        for(var j in services ){ var service = services[j]
            for( var route in service.routes ){
                var route_data = service.routes[route]
                if( ! route_data.usages ) route_data.usages = {};

                for( var m in route_data.methods ){ var method = route_data.methods[m]
                    if( ! route_data.usages[method] ) route_data.usages[method] = {}
                    route_data.usages[method][route] = {}

                    for( var u_fw in used_frameworks ){ var u_fw_id = u_fw.toLowerCase()
                        var data_type = route_data.data_type || false
                        var url = make_url(route_data.params_by_method, route, method !== "GET");
                        route_data.usages[method][route][u_fw] = UsageFactory[u_fw_id](route, method, url, data_type, route_data.params_by_method)
                    }

                    for(var t in route_data.alternates ){
                        var route_alt = route_data.alternates[t]
                        route_data.usages[method][route_alt] = {}

                        for( var u_fw in used_frameworks ){ var u_fw_id = u_fw.toLowerCase()
                            var data_type = route_data.data_type || false
                            var url = make_url(route_data.params_by_method, route_alt, method !== "GET");
                            route_data.usages[method][route_alt][u_fw] = UsageFactory[u_fw_id](route_alt, method, url, data_type, route_data.params_by_method)
                        }
                    }
                }
                service.routes[route] = route_data
            }
        }
    }
    function apply_response_models(domains, common_models){
        var services = get_services(domains)
        for(var j in services ){ var service = services[j]
            for( var route in service.routes ){
                var route_data = service.routes[route]
                for( var ref_model in route_data.response_models ){
                    if( common_models[ref_model] ){
                        route_data.response_models[ref_model].model = common_models[ref_model];
                    }else{
                        // otherwise set a default special model to show the issue
                        route_data.response_models[ref_model].model = {
                            "title":"Missing model "+service.response_model
                            ,"type": "object"
                            ,"properties": {
                            }
                            ,"required": []
                        }
                    }
                }
            }
        }
    }
    function apply_response_examples(domains, common_examples){
        var services = get_services(domains)
        for(var j in services ){ var service = services[j]
            for( var route in service.routes ){
                var route_data = service.routes[route]
                for( var ex_ref in route_data.examples ){
                    route_data.examples[ex_ref]["content"] = JSON.stringify(common_examples[ex_ref], null, 3)
                }
            }
        }
    }

    exports.build = function(config){
        // optimized data
        var data = init_config(config)
        resolve_models(data.common_models)
        resolve_examples(data.common_models, data.common_examples)
        apply_response_models(data.domains, data.common_models)
        apply_response_examples(data.domains, data.common_examples)
        apply_common_parameters(data.domains, data.common_params)
        apply_usages(data.domains, data.used_framework)
        return data
    };
}(typeof exports === 'object' && exports || this));

