
"use strict";

(function($){
    function addOverLay(){
        if( $("#bg_overlay").length == 0 ){
            $("<div id='bg_overlay'><div class='bg_color'></div></div>").appendTo("body")
        }
        return $("#bg_overlay")
    };
    function removeOverLay(){
        $("#bg_overlay").remove()
    };
    var center_interval;
    function PopInElement(el){
        $("<div class='popped_in_el'></div>").insertAfter(el)
        $(el).appendTo("#bg_overlay")

        var center_el = (function (el){
            return function(){
                var e_w = $(el).outerWidth()
                var e_h = $(el).outerHeight()

                var v_h = $("body").outerHeight()
                var v_w = $("body").outerWidth()

                var s_t = $(window).scrollTop();
                var s_l = $(window).scrollLeft();

                $(el).css("top", (s_t+(v_h-e_h)/2)+"px");
                $(el).css("left",(s_l+(v_w-e_w)/2)+"px");
            }
        })(el);
        center_el(el)
        center_interval = window.setInterval(center_el, 150)
    };
    function PopOutElement(el){
        $(el).insertBefore(".popped_in_el")
        $(".popped_in_el").remove()
        window.clearInterval(center_interval)
    };

    function open_options(overlay){
        $(overlay).addClass("enabled")
        $(".options").addClass("enabled")
        PopInElement(".options")
    };

    function close_options(overlay){
        $(overlay).removeClass("enabled")
        $(".options").removeClass("enabled")
        PopOutElement(".options")
        $(overlay).unbind("click")
        removeOverLay()
    };

    function do_export(version_major, version_minor, new_changelog, done){

        var r_max = 3;
        var r = 1;
        var stop_interval = false;
        $(".block_loader").addClass("step"+r)
        var an_interval = window.setInterval(function(){

            if(r<r_max){
                $(".block_loader").addClass("step"+(r+1))
                $(".block_loader").removeClass("step"+(r))
                r++
            }else{
                $(".block_loader").removeClass("step"+(r))
                r=0
            }
            if( stop_interval && r>=r_max){
                $(".block_loader").removeClass("step"+(r+1))
                $(".block_loader").removeClass("step"+(r))
                clearInterval(an_interval);
            }
        }, 305);

        $.ajax({
            type: 'POST'
            ,url: $(".btn_export").attr("href")
            ,data: {
                "version_major":version_major
                ,"version_minor":version_minor
                ,"new_changelog":new_changelog
            }
            ,success: function(data){
                // console.log(data)
                stop_interval = true;
                if( done ) done();
                $(".options .btn_close").click()
            }
            ,error: function(xhr, type){
                alert('Ajax error!')
            }
        })
    };

    var versions_template;
    function display_versions(done){
        if( ! versions_template )
            versions_template = new EJS({url: '/template/testing2/options/versions.ejs'})

        $.get("/versions",function(versions){
            versions_template.update('versions_list', versions)
            if( done ) done();
            $(".revision_item").unbind("click")
            $(".revision_item").bind("click", function(){
                var i = $(this).parent().index()
                var c_version = versions.versions[i];

                $('.revision .major option[value="'+c_version.major+'"]').get(0).selected = true;
                $('.revision .minor option[value="'+c_version.minor+'"]').get(0).selected = true;

                $('textarea[name="changelog"]').val(c_version.changelog)
            })
        });
    }


    $(".btn_export").click(function(){
        var overlay = addOverLay()
        open_options(overlay)
        $(overlay).click(function(ev){
            if( $(ev.target).hasClass("bg_color") ){
                close_options(overlay)
            }
        })
        $(".options .btn_close").click(function(){
            close_options(overlay)
        })
        return false;
    });

    (function(phantomizer){
        var queue = phantomizer.queue;
        // render the defintion only if the app execute JIT
        queue.render_static(function(next){
            display_versions( )

            var is_exporting = false;
            $(".options>button").click(function(){
                if( is_exporting ) return;
                is_exporting = true;
                var changelog = $('textarea[name="changelog"]').val();
                do_export(
                    $('.revision .major').val(),
                    $('.revision .minor').val(),
                    $('textarea[name="changelog"]').val(),
                    function(){
                    is_exporting = false;
                    display_versions( )
                });
            })

            next();
        })
        // start render
        queue.done();
    })(phantomizer /* global variable */);

    // force opening window options for testing purpose, safe to remove
    // $(".btn_export").click()

})($ /* global variable */);