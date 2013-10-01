<?php

$config_file = $argv[1];
$config = null;
$verbose = true;


if( file_exists($config_file) == false ){
    echo "Configuration file not found\n\t".$config_file;
    exit(1);
}
$config = json_decode( file_get_contents($config_file) );

return $config;