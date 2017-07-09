var day = "Friday";

function updateData() {
	return;
}

$(document).ready(function() {
	
	navigators = $(".nav-tabs li");
	navigators.on("click", function(ev) {
		$(this).addClass("active");
		$(navigators.not(this)).removeClass("active");
		day = this.dataset.day;
		updateData();
	});

});