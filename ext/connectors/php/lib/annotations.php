<?php
// internally we use addendum to do the whole annotations parsing job
include(__DIR__ . "/addendum/annotations.php");
// addendum related stuff, they are the annotation you may declare
class Serpent_Domain extends Annotation {}
class Serpent_Service extends Annotation {}
class Serpent_Route extends Annotation {}
class Serpent_Method extends Annotation {}
class Serpent_Response extends Annotation {}
class Serpent_Parameter extends Annotation {
    public $description;
    public $name;
    public $pattern;
    public $example;
    public $sources;
}
class Serpent_Property extends Annotation {
    public $title;
    public $description;
    public $type;
    public $pattern;
    public $required;
    public $default;
}
class Serpent_ResponseModel extends Annotation {}
class Serpent_ExampleModel extends Annotation {}
class Serpent_Items extends Annotation {}
class Serpent_Example extends Annotation {}
class ParametersModel extends Annotation {}





function transform_class_properties_to_model($item){
    $retour = array();

    $properties = get_property_list($item);
    foreach( $properties as $name=>$prop){
        $default = $prop["default"];

        $type = parse_docblock_annot(array($item,$name), "var");
        if( $type === false ){
            $type = gettype($default);
        }elseif( class_exists($type) ){
            $ref = $type;
            $type = "object";
        }

        $prop = array(
            "type"=>$type
            // ,"description"=>""
            // ,"required"=>false
            //,"default"=>""
            //,"pattern"=>""
            //,"items"=>""
        );

        if ($type == "array" ){
            $annotation = get_annotation(array($item,$name))->getAnnotation("Items");
            if( $annotation !== false ){
                if( $annotation->value == NULL ){
                    echo "Annotation Items not parsed correctly or missing in $item::$name\n";
                }else{
                    $prop["items"] = transform_class_to_model($annotation->value);
                }
            }
        }else if( $type == "object" ){
            $prop = transform_class_to_model($ref);
        }

        if( $default !== NULL ){
            $prop["default"] = $default;
        }

        $prop_ = resolve_property(array($item,$name));
        if( $prop_ !== false ){
            $prop = array_merge($prop, $prop_);
        }

        $prop = array_merge($prop,extract_title_description($prop_));
        if( isset($prop["description"]) == false || $prop["description"] == "" ){
            $prop["description"] = parse_docblock_text(array($item,$name));
        }

        $retour[$name] = $prop;
    }
    return $retour;
}

function transform_properties_to_example($item, $stack=array()){
    $stack[] = $item;
    $retour = array();
    $ref = new ReflectionClass($item);
    $default = $ref->getDefaultProperties();
    foreach( $ref->getProperties(ReflectionProperty::IS_PUBLIC) as $property ){

        $name = $property->getName();
        $def_val = $default[$name];

        $var_type = parse_docblock_annot(array($item,$name), "var");

        if( $var_type == "NULL" ){
            $retour[$name] = NULL;
        }else if( $var_type !== false && class_exists($var_type) ){
            if( in_array($var_type, $stack) ){
                $retour[$name] = "*recursion of $var_type*";
            }else{
                $retour[$name] = transform_properties_to_example($var_type, $stack);
            }
        }else if( $def_val !== NULL ){
            if( is_string( $def_val ) ) $retour[$name] = htmlentities($def_val);
            else $retour[$name] = $def_val;
        }elseif($var_type == "array"){
            $values = array();
            $annotations = get_annotation(array($item,$name))->getAllAnnotations("Example");
            foreach( $annotations as $annotation ){
                $value = $annotation->value;
                if( class_exists($annotation->value) ){
                    $value = transform_properties_to_example($annotation->value, $stack);
                }
                $values[] = $value;
            }
            $retour[$name] = $values;
        }else{
            $annotation = get_annotation(array($item,$name))->getAnnotation("Example");
            if( $annotation != false ){
                $value = $annotation->value;
                if( class_exists($annotation->value) ){
                    $value = transform_properties_to_example($annotation->value, $stack);
                }
                $retour[$name] = $value;
            }
        }
    }
    array_pop ( $stack );
    return $retour;
}
function transform_class_to_model($class_name){
    $model = array(
        "type"=>"object"
        // "title"=>""
        // ,"description"=>""
    ,"properties"=>array()
        // ,"required"=>array()
    );
    $annotation = resolve_response_model($class_name);
    // let s try first to load title and description fom annotation
    $model = array_merge($model,extract_title_description($annotation));
    // tries now to load title and description from the doc block itself
    $model = array_merge($model,parse_docblock_title_desc($class_name));
    // finally iterate over the properties of the model and bind them
    $model["properties"] = transform_class_properties_to_model($class_name);
    return $model;
}









function resolve_domain($item){
    $retour = false;
    $annotation = get_annotation($item)->getAnnotation('Domain');
    if( $annotation != null ){
        $retour = array();
        if( isset($annotation->value["title"]) )    $retour["title"] = $annotation->value["title"];
        else if( isset($annotation->value[0]) )     $retour["title"] = $annotation->value[0];
        if( isset($annotation->value["description"]) )   $retour["description"] = $annotation->value["description"];
        else if( isset($annotation->value[1]) )     $retour["description"] = $annotation->value[1];
        if( isset($annotation->value["name"]) )     $retour["name"] = $annotation->value["name"];
    }
    return $retour;
}


function resolve_service($item){
    $retour = false;
    $annotation = get_annotation($item)->getAnnotation('Service');
    if( $annotation != false ){
        $retour = array();
        if( isset($annotation->value["title"]) )    $retour["title"] = $annotation->value["title"];
        else if( isset($annotation->value[0]) )     $retour["title"] = $annotation->value[0];
        if( isset($annotation->value["description"]) )   $retour["description"] = $annotation->value["description"];
        else if( isset($annotation->value[1]) )     $retour["description"] = $annotation->value[1];
        if( isset($annotation->value["name"]) )     $retour["name"] = $annotation->value["name"];
    }
    return $retour;
}
function resolve_route($item){
    $annotations = get_annotation($item)->getAllAnnotations('Route');
    if( $annotations != false ){
        $routes = array();
        foreach($annotations as $annotation ){
            if( isset($annotation->value["route"]) ) $routes[] = $annotation->value["route"];
            else if( is_string($annotation->value) ) $routes[] = $annotation->value;
        }
        return $routes;
    }
    return false;
}
function resolve_methods($item){
    $route_methods = false;
    $annotation = get_annotation($item)->getAnnotation('Method');
    if( $annotation != false ){
        if( is_array($annotation->value) ) $route_methods = $annotation->value;
        else $route_methods = explode(" ",$annotation->value);
        return $route_methods;
    }
    return $route_methods;
}
function resolve_parameters($item){
    $parameters = array();
    $annotations = get_annotation($item)->getAllAnnotations('Parameter');
    foreach( $annotations as $annotation ){
        $param = array();
        foreach( get_property_list("Serpent_Parameter") as $k=>$prop ){
            if( isset($annotation->{$k}) ){
                $param[$k] = $annotation->{$k};
            }
        }
        if( isset($param["sources"]) && is_string($param["sources"]) ){
            $param["sources"] = explode(" ", $param["sources"]);
        }
        $parameters[$annotation->name] = $param;
    }
    return $parameters;
}
function resolve_property($item){
    $prop = array();
    $annotation = get_annotation($item)->getAnnotation('Property');
    if( $annotation != false ){
        foreach( array("description","name","pattern","default","source","required") as $k ){
            if( isset($annotation->value[$k]) ){
                $prop[$k] = $annotation->value[$k];
            }else if( isset($annotation->{$k}) ){
                $prop[$k] = $annotation->{$k};
            }
        }
    }
    return $prop;
}
function resolve_response_model($item){
    $retour = false;
    $annotations = get_annotation($item)->getAllAnnotations('Response');
    if( $annotations != false ){
        $retour = array();
        foreach( $annotations as $annotation ){
            if( $annotation->value != NULL ){
                if( is_string($annotation->value) ){
                    $retour[$annotation->value] = array(
                        "return_code"=>"200",
                        "data_type"=>"text",
                    );
                }else{
                    $ex = array();
                    foreach( array("return_code","data_type","ref") as $k ){
                        if( isset($annotation->value[$k]) ){
                            $ex[$k] = $annotation->value[$k];
                        }else if( isset($annotation->{$k}) ){
                            $ex[$k] = $annotation->{$k};
                        }
                    }
                    $retour[$ex["ref"]] = $ex;
                    unset($retour[$ex["ref"]]["ref"]);
                }
            }
        }
    }
    return $retour;
}
function resolve_parameters_model($item){
    $retour = false;
    $annotations = get_annotation($item)->getAllAnnotations('ParametersModel');
    if( $annotations != false ){
        $retour = array();
        foreach( $annotations as $annotation ){
            if( $annotation->value != NULL ){
                if( is_string($annotation->value) ){
                    $retour[$annotation->value] = NULL;
                }else{
                    $retour[$annotation->value["ref"]] = array($annotation->value["method"]);
                }
            }
        }
    }
    return $retour;
}
function resolve_example_models($item){
    $retour = false;
    $annotations = get_annotation($item)->getAllAnnotations('ExampleModel');
    if( $annotations != false ){
        $retour = array();
        foreach( $annotations as $annotation ){
            if( $annotation->value != NULL ){
                $ex = array();
                foreach( array("description","title","ref") as $k ){
                    if( isset($annotation->value[$k]) ){
                        $ex[$k] = $annotation->value[$k];
                    }else if( isset($annotation->{$k}) ){
                        $ex[$k] = $annotation->{$k};
                    }
                }
                $retour[$ex["ref"]] = $ex;
                unset($retour[$ex["ref"]]["ref"]);
            }
        }
    }
    return $retour;
}





function create_route_annotations($reflected_item, $all_routes){

    // default structure for a route
    $route = array(
        "route"=>array_shift($all_routes)
    ,"alternates"=> $all_routes
    ,"methods"=> array()
    );


    // find for method annotations
    $methods = resolve_methods($reflected_item);
    if( $methods !== false ){
        // bind the new methods to the routes
        $route["methods"] = array_unique(array_merge($route["methods"], $methods));
    }

    // look up for route parameters
    // initialize a default route parameters structure
    $params_by_method = array(
        "URL"   =>array(
            "title"=>"URL",
            "type"=>"object",
            "properties"=>array(),
        )
    ,"GET"  =>array(
            "title"=>"GET",
            "type"=>"object",
            "properties"=>array(),
        )
    ,"POST" =>array(
            "title"=>"POST",
            "type"=>"object",
            "properties"=>array(),
        )
    );
    // check first for ParametersModels
    $parameters_model = resolve_parameters_model($reflected_item);
    if( $parameters_model !== false ){
        foreach( $parameters_model as $parameter_model=>$methods_model ){
            if( $methods_model === NULL ){
                $methods_model = array($route["methods"][0]);
            }
            foreach( $methods_model as $m ){
                $params_by_method[$m]["properties"] = transform_class_properties_to_model($parameter_model);
            }
        }
        //-
    }
    // otherwise test for inlined parameters
    else{
        $params = resolve_parameters($reflected_item);
        foreach($params_by_method as $method => $default_){
            foreach( $params as $p_name=>$param ){
                if( in_array($method,$param["sources"]) ){
                    $params_by_method[$method]["properties"][$p_name] = $param;
                    unset($params_by_method[$method]["properties"][$p_name]["name"]);
                }
            }
        }
    }

    // intialize default values
    if( isset($route["params_by_method"]) == false ){
        $route["params_by_method"] = array(
            "URL"   =>array(
                "title"=>"URL",
                "type"=>"object",
                "properties"=>array(),
            )
        ,"GET"  =>array(
                "title"=>"GET",
                "type"=>"object",
                "properties"=>array(),
            )
        ,"POST" =>array(
                "title"=>"POST",
                "type"=>"object",
                "properties"=>array(),
            )
        );
    }

    // bind found parameters onto the route instance
    foreach( $params_by_method as $m => $params_method ){
        foreach( $params_method["properties"] as $p_name=>$param){
            $route["params_by_method"][$m]["properties"][$p_name] = $param;
        }
    }



    // If there is a response model class name, then let's use it
    $response_models = resolve_response_model($reflected_item);
    if( $response_models == false ){
        echo "  Missing response models for ".reflected_to_string($reflected_item)."\n";
    }else{
        if( isset($route["response_models"]) == false ) $route["response_models"] = array();
        foreach( $response_models as $ref => $response_model){
            if( is_string($ref) && class_exists($ref) ){
                // if it is a string, we consider that the model will be exported in its own file
                // thus we just need to reference the model filename such as :
                // [namespace]/[class].json
                $f_rel = relative_path($ref).".json";
                $route["response_models"][$f_rel] = $response_model;
            }
        }
    }

    // Then look up for examples bind to this service
    $example_models = resolve_example_models($reflected_item);
    if( $example_models == false ){
        echo "  Missing example for ".reflected_to_string($reflected_item)."\n";
    }else{
        // iterates over each example declared
        foreach( $example_models as $ref=>$example ){
            // if it s a class, them reference it
            if( is_string($ref) && class_exists($ref) ){
                // [namespace]/[class].json
                $ref = relative_path($ref).".json";
                $route["examples"][$ref] = $example;
            }
        }
    }

    $route["methods"] = array_unique($route["methods"]);

    // -
    $title_desc = parse_docblock_title_desc($reflected_item);
    $route = array_merge($route,$title_desc);

    return $route;
}