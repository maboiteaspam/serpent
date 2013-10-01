
"use strict";

$(".service").click(function(ev){
    if( $.contains($(this).find(".title").get(0), ev.target) ||
        $(ev.target).hasClass("title") && $(ev.target).parent().hasClass("service") ){
        var service_el = this
        $(service_el).toggleClass("clicked")
    }
});

$(".route").click(function(ev){
    if( $.contains($(this).find(".title").get(0), ev.target) ||
        $(ev.target).hasClass("title") && $(ev.target).parent().hasClass("route") ){
        var route_el = this
        var method_el = $(this).find(".title>.method").first()
        $(route_el).toggleClass("clicked")
        if( $(route_el).hasClass("clicked") ){
            $(method_el).addClass("clicked")
        }else{
            $(route_el).find(".title>.method").removeClass("clicked")
        }
    }
})
$(".route .title").click(function(ev){
    var route_el = $(this).parent();

    if( $(route_el).hasClass("clicked") ){
        $(route_el).find(".title>.method").removeClass("clicked")
        $(route_el).removeClass("clicked")
    }else{
        $(route_el).find(".title>.method").first().trigger("click")
    }
    ev.cancelBubble = true;
    return false;
})
$(".route .title .method").click(function(ev){
    var route_el = $(this).parent().parent();
    var method_el = $(this);
    if( $(route_el).hasClass("clicked") ){
        if($.contains($(route_el).find(".title>.method.clicked").get(0), ev.target) ||
            ev.target == method_el.get(0) ){
            $(route_el).toggleClass("clicked")
            if( $(route_el).hasClass("clicked") ){
                $(method_el).addClass("clicked")
            }else{
                $(route_el).find(".title>.method").removeClass("clicked")
            }
        }else{
            $(route_el).find(".title>.method").removeClass("clicked")
            $(method_el).addClass("clicked")
            var i = $(method_el).index()
            var e = $(route_el).find(".content .usages .content .method").get(i)
            $(route_el).find(".content .usages .content .method").hide()
            $(e).show()
        }
    }else{
        $(route_el).toggleClass("clicked")
        if( $(route_el).hasClass("clicked") ){
            $(method_el).addClass("clicked")
        }else{
            $(route_el).find(".title>.method").removeClass("clicked")
        }
    }
    return false;
})

$('.property-schema').click(function(ev){
    if( $(ev.target).hasClass("property") ){
        $(this).toggleClass("clicked")
        ev.cancelBubble = true;
    }
})


function find_selected(select){
    var r = []
    var c = $(select).children()
    for( var i=0;i< c.length;i++){
        var e = $(c).get(i)
        if( $(e).prop("selected") ){
            r.push(e)
        }
    }
    return r;
};

$('.method .entries').each(function(k,v){
    var fw_sel = $(v).find("select:nth-child(1)")
    var route_sel = $(v).find("select:nth-child(2)")

    function changed_usage(parent){
        $(parent).find('.response_content>div').hide()

        var fw_id = $(fw_sel).val()
        var route_id = $(route_sel).val()

        var f = $(parent).find('.response_content > .'+fw_id+'[route="'+route_id+'"]')
        if( f ) $(f).show()
    }
    $(fw_sel).change(function(){
        changed_usage($(v).parent())
    })
    $(route_sel).change(function(){
        changed_usage($(v).parent())
    })
    window.setTimeout(function(){
        changed_usage($(v).parent())
    }, 1000)
})
$('.responses .entries select:first-child').each(function(k,v){
    $(v).change(function(){
        var opt = find_selected(v)
        var parent = $(v).parent().parent()
        $(parent).find('.response_content>div').hide()
        var f = $(parent).find('.response_content>div').get( $(opt).index() )
        if( f ) $(f).show()
    })
})
$('.response_model .entries select:first-child').each(function(k,v){
    $(v).change(function(){
        var opt = find_selected(v)
        var parent = $(v).parent().parent()
        $(parent).find('.response_content>div').hide()
        var f = $(parent).find('.response_content>div').get( $(opt).index() )
        if( f ) $(f).show()
    })
})

$('.route .usages .method select').each(function(k,v){
    $(v).change(function(){
        var p = $(v).parent()
        var opt = find_selected(v)
        $(p).children(".framework").hide()
        var f = $(p).children(".framework").get( $(opt).index() )
        $(f).show()
    })
})