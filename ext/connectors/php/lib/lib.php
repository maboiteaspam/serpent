<?php

function relative_path($path){
    $path = clean_path($path);
    if( substr($path,0,1) == "/" ){
        $path = substr($path,1);
    }
    return $path;
}
function clean_path($path){
    $path = str_replace("\\","/",$path);
    $path = str_replace("\\","/",$path);
    $path = str_replace("\\","/",$path);
    $path = str_replace("//","/",$path);
    $path = str_replace("//","/",$path);
    $path = str_replace("//","/",$path);
    return $path;
}
function clean_dirname($path){
    $path = dirname($path);
    $path = $path == "."?"":$path;
    $path =$path == "/"?"":$path;
    $path =$path == "\\"?"":$path;
    return $path;
}

function delTree($dir) {
    if( is_dir($dir) == false ) return true;
    $files = array_diff(scandir($dir), array('.','..'));
    foreach ($files as $file) {
        (is_dir("$dir/$file")) ? delTree("$dir/$file") : unlink("$dir/$file");
    }
    return rmdir($dir);
}
function scanRecursive($path, $baseDir="") {
    $retour = array();
    $baseDir=$baseDir==""?$path:$baseDir;
    $dh = opendir($path);
    if( $dh == false ){
        throw new \Exception("$path does not exists");
    }
    while (($file = readdir($dh)) !== false) {
        if (substr($file, 0, 1) == '.') continue;
        $rfile = "{$path}/{$file}";
        if (is_dir($rfile)) {
            $retour = array_merge($retour, scanRecursive($rfile, $baseDir));
        } else {
            $retour[substr($rfile,strlen($baseDir))] = $file;
        }
    }
    closedir($dh);
    return $retour;
}
function findArrayKeys($pattern, $items) {
    $retour = array();
    foreach($items as $k=>$item ){
        if( preg_match($pattern,$k, $matches) ){
            $retour[$k] = $matches;
        }
    }
    return $retour;
}

function extract_title_description($annot){
    $retour = array(
        // "title"=>""
        // ,"description"=>""
    );

    if( is_string($annot) && trim($annot) != "" ){
        $retour["title"] = $annot;
    }else if( isset($annot[0]) && trim($annot[0]) != "" ){
        $retour["title"] = $annot[0];
        if( isset($annot[1]) && trim($annot[1]) != "" ){
            $retour["description"] = $annot[1];
        }
    }else if( isset($annot["title"]) && trim($annot["title"]) != "" ){
        $retour["title"] = $annot["title"];
        if( isset($annot["description"]) && trim($annot["description"]) != "" ){
            $retour["description"] = $annot["description"];
        }
    }

    return $retour;
}

function parse_docblock_title_desc ($item){
    $text = parse_docblock_text ($item);
    return parse_text_title_desc ($text);
}
function parse_text_title_desc ($text){
    $retour = array();

    $eol = strpos($text,"\n\n") > -1 ? "\n" : "\r\n";

    if( strpos($text,"$eol$eol") > -1 ){
        $retour["title"] = substr($text,0,strpos($text, "$eol$eol"));
        $text = substr($text,strlen($retour["title"]));
        $text = ltrim($text);
        if( trim($text)!="" ){
            $retour["description"] = trim($text);
        }
        if( isset($retour["description"]) ) $retour["description"] = trim($retour["description"]);
        if( isset($retour["title"]) ) $retour["title"] = trim($retour["title"]);

        if( $retour["description"] == "" ) unset($retour["description"]);
        if( $retour["title"] == "" ) unset($retour["title"]);
    }elseif( count(explode("$eol$eol", $text)) == 1 ){
        $retour["title"] = trim($text);
    }
    return $retour;
}
function parse_docblock_text ($item){
    $retour = "";
    $ref = get_reflection($item);
    $retour = $ref->getDocComment();
    $retour = substr($retour, 3, -2);
    $retour = preg_replace("/^\s*\*\s*@.+$/m","",$retour);
    $retour = preg_replace("/^\s*\*/m","",$retour);
    return trim($retour);
}
function parse_docblock_annot ($item, $annot_name){
    $retour = false;
    $ref    = get_reflection($item);
    $text   = $ref->getDocComment();
    $text   = substr($text, 3, -2);
    if( preg_match("/^\s*\*\s*@".$annot_name."\s+(.+)$/im",$text, $matches) > 0 ){
        $retour = trim($matches[1]);
    }
    return $retour;
}


function get_property_list($class, $visibility=null){
    $retour = array();
    $visibility=$visibility===NULL?ReflectionProperty::IS_PUBLIC:$visibility;
    $ref = new ReflectionClass($class);
    $default = $ref->getDefaultProperties();
    foreach( $ref->getProperties($visibility) as $property ){
        $name = $property->getName();
        $retour[$name] = array('default'=>$default[$name]);
    }
    return $retour;
}



function parse_classname ($name){
    // thanks to php.net/manual/en/function.get-class.php#107964
    return array(
        'namespace' => array_slice(explode('\\', $name), 0, -1),
        'classname' => join('', array_slice(explode('\\', $name), -1)),
    );
}

function get_reflection($item){
    $reflection = $item;
    if( is_string($item) && function_exists($item) ){
        $reflection = new ReflectionFunction($item);
    }else if( is_string($item) && class_exists($item)){
        $reflection = new ReflectionClass($item);
    }else if( is_array($item) && method_exists($item[0],$item[1])){
        $reflection = new ReflectionMethod($item[0],$item[1]);
    }else if( is_array($item) && property_exists($item[0],$item[1])){
        $reflection = new ReflectionProperty($item[0],$item[1]);
    }
    return $reflection;
}
function reflected_to_string($item){
    $string = $item;
    if( is_string($item) ){
        $string = $item;
    }elseif( $item instanceof ReflectionClass ){
        $string = $item->name;
    }elseif( $item instanceof ReflectionMethod ){
        $string = $item->class."::".$item->name;
    }elseif( $item instanceof ReflectionFunction ){
        $string = $item->name;
    }
    return $string;
}
function list_methods( $class_name ){
    $reflected_item = get_reflection($class_name);
    return $reflected_item->getMethods();
}

function get_annotation($item){
    $reflection = false;
    if( is_string($item) && function_exists($item) ){
        $reflection = new ReflectionAnnotatedFunction($item);
    }else if( is_string($item) && class_exists($item)){
        $reflection = new ReflectionAnnotatedClass($item);
    }else if( is_array($item) && method_exists($item[0],$item[1])){
        $reflection = new ReflectionAnnotatedMethod($item[0],$item[1]);
    }else if( is_array($item) && property_exists($item[0],$item[1])){
        $reflection = new ReflectionAnnotatedProperty($item[0],$item[1]);
    }else if( $item instanceof ReflectionMethod ){
        $reflection = new ReflectionAnnotatedMethod($item->class,$item->name);
    }else if( $item instanceof ReflectionClass ){
        $reflection = new ReflectionAnnotatedClass($item->class);
    }else{
        throw new \Exception($item);
    }
    return $reflection;
}


