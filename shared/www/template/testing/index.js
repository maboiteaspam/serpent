
// ui
function showEl(el, then){
    var easing = ''
    easing = 'linear'
    easing = 'ease'
    if( $(el).length >0 ){
        var h = $(el).data("_height_")

        $(el).animate({
            height:h+"px"
        }, 180, easing,function(){
            $(el).children().css("visibility", "visible")
            $(el).css("height", null)
            $(el).css("visibility", "visible")
            if( then ) then("show")
        })
        $(el).removeClass("hide")
    }
}
function hideEl(el, then){
    var easing = ''
    easing = 'linear'
    easing = 'ease'
    if( $(el).length > 0 && $(el).css("visibility") != "hidden" ){
        var h = $(el).outerHeight(true)
        $(el).css("overflow", "hidden")
        $(el).css("height", h+"px")
        $(el).data("_height_", h)
        $(el).children().css("visibility", "hidden")
        $(el).css("visibility", "hidden")
        $(el).animate({
            height:"0px"
        }, 180, easing,function(){
            if( then ) then("hide")
        })
        $(el).addClass("hide")
    }
}
function expander(click_node, content_node, then){
    $(click_node).on("click",function(){
        if( $(content_node).hasClass("hide") == false ){
            $(click_node).removeClass("clicked")
            hideEl(content_node, then)
            return false; // cancel click on collapse
        }else{
            $(click_node).addClass("clicked")
            showEl(content_node, then)
        }
    })
}

var find_selected = function(select){
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
        changed_usage($(v).parent().parent())
    })
    $(route_sel).change(function(){
        changed_usage($(v).parent().parent())
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
$('.route .title .method').each(function(k,v){
    $(v).on('click',function(){
        if( $(v).hasClass("clicked") == false ){

            $(v).parent().parent().find(".content .method").hide()
            var f = $(v).parent().parent().find(".content .method").get( $(v).index() )
            if( f ) $(f).show()
            if( $(v).parent().find(".clicked").length > 0 ){
                $(v).parent().find(".clicked").removeClass("clicked")
                $(v).addClass("clicked")
                return false
            }
            $(v).addClass("clicked")
        }else{
            $(v).removeClass("clicked")
            var f = $(v).parent().parent().find(".content .method").get( $(v).index() )
            if( f ) $(f).hide()
        }
    })
})

$('.property-schema .property').each(function(k,v){

    var click_el = $(v)
    var content_el = $(v).next()
    if( ! $(content_el).hasClass("property_properties") ){
        content_el = $(content_el).next()
    }
    var content2_el = $(content_el).next()

    hideEl(content_el)
    hideEl(content2_el)

    $(click_el).on('click',function(){

        if( $(click_el).hasClass("clicked") == false ){
            showEl(content_el)
            showEl(content2_el)
            $(click_el).addClass("clicked")
        }else{
            $(click_el).removeClass("clicked")
            hideEl(content_el)
            hideEl(content2_el)
        }
        return false
    })
})


$('.response_content').each(function(k,v){
    $(v).find(".model_inspector").each(function(k,v){
        if( k > 0 ) $(v).hide()
    })
})
// response_content

$('.route').each(function(k,v){
    var content_node = $(v).children(".content")
    var click_node = $(v).children(".title")
    expander(click_node, content_node, function(mode){
        if( mode =="show" ){
            if( $(click_node).find(".clicked").length == 0 ){
                $(click_node).find(".method").first().triggerHandler("click");
            }
        }else{
            $(click_node).find(".clicked").triggerHandler("click");
        }
    })
    hideEl(content_node)
    $(click_node).find("select").click(function(ev){
        ev.cancelBubble = true;
    });
})
$('.domain > h2').each(function(k,v){
    var content_node = $(v).next()
    var click_node = $(v)
    expander(click_node, content_node)
    hideEl(content_node)
})