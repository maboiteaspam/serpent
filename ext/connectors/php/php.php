<?php

// load up the config, actually bootstrap do it for us
$config = include(__DIR__ . "/bootstrap.php");

$current_cwd_dir = getcwd();

include(__DIR__ . "/lib/annotations.php");
include(__DIR__ . "/lib/lib.php");

// gets the src path of your php app
$path = $config->generator->src_path;

// add a faveVar class to accept any call without much damage on the fake variables created
class FakeVar{
    public function __get($p){
        return false;
    }
    public function __set($p,$v){
        return false;
    }
    public function __call($m,$n){
        return false;
    }
}
// initiate fake variable
foreach($config->generator->fake_var as $var){
    $$var = new FakeVar();
}

$system_classes    = get_declared_classes();

// load app bootstrap, app is responsible to initialize some variable and setup autoloader
if( $config->generator->app_bootstrap != "" &&
    file_exists($config->generator->app_bootstrap) )
    include($config->generator->app_bootstrap);

// scan files to load
$files = scanRecursive($path);
// load them within this context, we pray they won't hang :/
// ideally they are only class file, or routes declaration file
foreach($files as $file_path=>$filename ){
    $file_path = realpath($path.$file_path);
    if( in_array($file_path, get_included_files()) == false && substr($file_path,-4) == ".php" ){
        include_once($file_path);
    }
}

// some variables to store collected information about your project
$domains    = array();
$models     = array();
$examples   = array();
$common_params = array();

// collect the classes and function declared by your project
$all_classes = get_declared_classes();
$classes = array();
foreach( $all_classes as $class_name ){
    if( in_array($class_name, $system_classes) == false ){
        $classes[] = $class_name;
    }
}
$functions  = get_defined_functions();

// iterate over each function defined in the user project
foreach( $functions['user'] as $item ){

    // resolve domains, service and route annotations
    $domain = resolve_domain($item);
    $service = resolve_service($item);
    $all_routes = resolve_route($item);

    // if they are all found, then declare a new route
    if( $domain !== false &&
        $service !== false &&
        $all_routes !== false ){

        $d_name = $domain["name"];unset($domain["name"]);
        $s_name = $service["name"];unset($service["name"]);

        // make new domain if it does not exists yet
        if( isset($domains[$d_name]) == false ){
            $domains[$d_name] = array(
                "services"=>array()
            );
            $domains[$d_name] = array_merge($domains[$d_name], $domain);
        }

        // make a new service if it does not exists yet
        $service_obj = array(
            "description"=>"",
            "routes"=>array()
        );
        $service_obj = array_merge($service_obj ,$service);


        // bind the new routes of the service
        $route = create_route_annotations($item, $all_routes);
        $service_obj["routes"][$route["route"]] = $route;


        if( isset($domains[$d_name]["services"][$s_name]) ){
            foreach( $domains[$d_name]["services"][$s_name] as $k=>$v){
                if( is_array($v) ){
                    $service_obj[$k] = array_merge($v,$service_obj[$k]);
                }else{
                    $service_obj[$k] = $v;
                }
            }
        }
        $service_obj["methods"] = array_unique($service_obj["methods"]);
        $domains[$d_name]["services"][$s_name] = $service_obj;

        echo "Parsed function\t\t\t$item\n";
    }
}

// iterate over each method's class defined in the user project
foreach( $classes as $class_name ){
    $methods = list_methods($class_name);

    $class_domain = resolve_domain($class_name);
    $class_service = resolve_service($class_name);

    foreach( $methods as $item ){

        // resolve domains, service and route annotations
        $method_domain  = resolve_domain($item);
        $method_service = resolve_service($item);

        if( $method_domain == false && $class_domain !== false ){
            $domain = $class_domain;
        }

        if( $method_service == false && $class_service !== false ){
            $service = $class_service;
        }

        $all_routes = resolve_route($item);
        // if they are all found, then declare a new route
        if( $domain !== false &&
            $service !== false &&
            $all_routes !== false ){

            if( isset($domain["name"]) ){
                $d_name = $domain["name"];unset($domain["name"]);
            }elseif( isset($domain["title"]) ){
                $d_name = $domain["title"];unset($domain["title"]);
            }
            if( isset($service["name"]) ){
                $s_name = $service["name"];unset($service["name"]);
            }elseif( isset($service["title"]) ){
                $s_name = $service["title"];unset($service["title"]);
            }

            // make new domain if it does not exists yet
            if( isset($domains[$d_name]) == false ){
                $domains[$d_name] = array(
                    "services"=>array()
                );
                $domains[$d_name] = array_merge($domains[$d_name], $domain);
            }

            // make a new service if it does not exists yet
            $service_obj = array(
                "description"=>"",
                "routes"=>array()
            );
            $service_obj = array_merge($service_obj ,$service);


            // bind the new routes of the service
            $route = create_route_annotations($item, $all_routes);
            $service_obj["routes"][$route["route"]] = $route;


            if( isset($domains[$d_name]["services"][$s_name]) ){
                foreach( $domains[$d_name]["services"][$s_name] as $k=>$v){
                    if( is_array($v) ){
                        $service_obj[$k] = array_merge($v,$service_obj[$k]);
                    }else{
                        $service_obj[$k] = $v;
                    }
                }
            }
            //$service_obj["methods"] = array_unique($service_obj["methods"]); // is really needed ? Some doubt
            $domains[$d_name]["services"][$s_name] = $service_obj;

            echo "Parsed class method $item->class::$item->name\n";
        }
    }
}

// lets iterate now over the classes
foreach( $classes as $item ){
    echo "Performing\t\t\t$item\n";

    // look up for a response model annotation
    $response = resolve_response_model($item);
    if( $response !== false ){
        // make a new model if needed
        if( isset($models[$item]) == false )
            $models[$item] = array(
                "type"=>"object",
                // "title"=>"",
                // "description"=>"",
                "properties"=>"",
                // "required"=>array()
            );
        // let s try first to load title and description fom annotation
        $models[$item] = array_merge($models[$item],extract_title_description($response));
        // tries now to load title and description from the doc block itself
        $models[$item] = array_merge($models[$item],parse_docblock_title_desc($item));
        // finally iterate over the properties of the model and bind them
        $models[$item]["properties"] = transform_class_properties_to_model($item);
    }

    // look up for a response model annotation
    $parameters_model = get_annotation($item)->getAnnotation('ParametersModel');
    if( $parameters_model !== false ){
        // make a new model if needed
        if( isset($models[$item]) == false )
            $models[$item] = array(
                "type"=>"object",
                // "title"=>"",
                // "description"=>"",
                "properties"=>"",
                // "required"=>array()
            );
        // finally iterate over the properties of the model and bind them
        $models[$item]["properties"] = transform_class_properties_to_model($item);
    }

    // look up for an example model annotation
    $example = resolve_example_models($item);
    if( $example !== false ){
        $examples[$item] = transform_properties_to_example($item);
    }

    // finally, it is any of model or example, display some infos
    if( $response !== false ){
        echo "Parsed Response class\t\t$item\n";
    }
    if( $example !== false ){
        echo "Parsed Example class\t\t$item\n";
    }
    if( $parameters_model !== false ){
        echo "Parsed Parameters class\t\t$item\n";
    }
}



chdir($current_cwd_dir);

$domains_path   = $config->generator->tgt_paths->domains;
$models_path    = $config->generator->tgt_paths->models;
$examples_path  = $config->generator->tgt_paths->examples;
$params_path    = $config->generator->tgt_paths->params;

// clean target directories
delTree($domains_path);
delTree($models_path);
delTree($examples_path);
file_exists($params_path) ? unlink($params_path) : NULL;

mkdir($domains_path,0777,true);
mkdir($models_path,0777,true);
mkdir($examples_path,0777,true);
touch($params_path);


// generate the json domains files
foreach( $domains as $ref=>$item ){

    $ref = clean_path($ref);

    $ref_path = clean_dirname($ref);

    $ref_file = basename($ref);
    $ref_path = clean_path($domains_path."/".$ref_path."/");
    $ref_fp = $ref_path.$ref_file.".json";

    if( is_dir($ref_path) == false ) mkdir($ref_path, 0777, true);
    file_put_contents($ref_fp, json_encode($item, JSON_PRETTY_PRINT));
}

// generate the models json files
foreach( $models as $ref=>$item ){
    $ref = clean_path($ref);

    $ref_path = clean_dirname($ref);

    $ref_file = basename($ref);
    $ref_path = clean_path($models_path."/".$ref_path."/");
    $ref_fp = $ref_path.$ref_file.".json";

    if( is_dir($ref_path) == false ) mkdir($ref_path, 0777, true);
    file_put_contents($ref_fp, json_encode($item, JSON_PRETTY_PRINT));
}

// generate the examples json files
foreach( $examples as $ref=>$item ){
    $ref = clean_path($ref);

    $ref_path = clean_dirname($ref);

    $ref_file = basename($ref);
    $ref_path = clean_path($examples_path."/".$ref_path."/");
    $ref_fp = $ref_path.$ref_file.".json";

    if( is_dir($ref_path) == false ) mkdir($ref_path, 0777, true);
    file_put_contents($ref_fp, json_encode($item, JSON_PRETTY_PRINT));
}

// generate the common parameters file
file_put_contents($params_path, json_encode($common_params, JSON_PRETTY_PRINT));


// Finally return the config :/
return $config;
