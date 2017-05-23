$('#menu .icon-menu').click(function(e) {
    $('#menu .icon-menu').toggleClass('close');
    $('.menu').toggle("slow");
});

$(window).scroll(function () {
	var height = $('body').height();
	var scrollTop = $(window).scrollTop();
    var totalHeight = $(window).height();
	if(scrollTop>totalHeight)
	{
		  $('#navigation').addClass('fixed');
	}
	else
	{
		 $('#navigation').removeClass('fixed');
    }
    
    var innerPageheight = $('body.innerpage').height();
	var innerPagescrollTop = $(window).scrollTop();
	if(innerPagescrollTop>500)
	{
		  $('#navigation').addClass('fixed');
	}
	else
	{
		 $('#navigation').removeClass('fixed');
    }

});