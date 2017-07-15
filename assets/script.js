//Variabili principali
var day = "Friday";
var chart = "node";
var data;
var showSelection = [];

//Variabili per la dimensione dell'SVG
var svgContainer;
var chartWidth;
var chartHeight;

//Variabili per l'interazione con l'SVG
var mouseX;
var mouseY;
var ctrl;
var moving = false;
var selecting = false;
var selector;
var circles = [];
var rects = [];
var selection = [];
var selectionViewer;

var areaColors = {
	"Tundra Land": "PowderBlue",//"rgb(219, 238, 244)",
	"Entry Corridor": "Gainsboro",//"rgb(237, 234, 241)",
	"Kiddie Land": "PapayaWhip",//"rgb(255, 243, 203)",
	"Wet Land": "DarkSeaGreen",//"rgb(196, 213, 159)",
	"Coaster Alley": "Salmon" //"rgb(217, 149, 146)"
};

function updateLoaderPosition() {
	$("#loader").css({
		top: svgContainer.scrollTop + "px",
		left: svgContainer.scrollLeft + "px"
	});
}

function moveSVG(startLeft, startTop, startX, startY) {
	svgContainer.scrollLeft = startLeft - (mouseX - startX);
	svgContainer.scrollTop = startTop - (mouseY - startY);
	updateLoaderPosition();
	moving = requestAnimationFrame(function() {
		return moveSVG(startLeft, startTop, startX, startY);
	});
}

function stopSVGMotion() {
	cancelAnimationFrame(moving);
	moving = false;
	svg.css("cursor", "default");
}

//Variabili per la visualizzazione dei nodi
var maxLinks = 5000;
var maxNodes = 250;

$(document).ready(function() {
	
	//Pulsanti dei menù di navigazione
	function setNavEvents(selector, variable) {
		var group = $(selector);
		group.on("click", function(ev) {
			if ($(this).hasClass("active"))
				return;
			$(this).addClass("active");
			$(group.not(this)).removeClass("active");
			window[variable] = this.dataset[variable];
			updatePage();
		});
	}
	
	setNavEvents("[data-day]", "day");
	setNavEvents("[data-chart]", "chart");
	
	//Pulsanti per l'invio della selezione
	function sendSelection(chartString) {
		showSelection = selection;
		svgContainer.style.borderRadius = "0px 0px 4px 4px";
		$("#selectionTab").fadeIn().addClass("active");
		$(".nav-pills li").removeClass("active");
		$("li[data-chart='" + chartString + "']").addClass("active");
		chart = chartString;
		updatePage();
	}
	
	$("#sendToNodes").on("click", function() {
		return sendSelection("node");
	});
	$("#sendToBars").on("click", function() {
		return sendSelection("bar");
	});
	$("#sendToPatterns").on("click", function() {
		return sendSelection("pattern");
	});
	
	//Pulsante per la chiusura della selezione
	$("#closeSelection").on("click", function() {
		showSelection = [];
		svgContainer.style.borderRadius = "0px 4px 4px 4px";
		$("#selectionTab").fadeOut().removeClass("active");
		updatePage();
	});
	
	//Dimensioni dell'SVG
	svgContainer = document.getElementById("svgContainer");
	$(window).on("resize", updateSizes);
	
	//Interazioni con l'SVG
	selectionViewer = $("#selectionViewer");
	svg = $("svg")
	.on("contextmenu", function() {
		return false;
	})
	.on("mousemove", function(ev) {
		mouseX = ev.clientX;
		mouseY = ev.clientY;
	})
	.on("mousedown", function(ev) {	
		
		if (chart != "node")
			return;
		
		//Left Click
		if (ev.button == 0)
			startNodeSelection(ev);

		//Right Click
		else if (ev.button == 2) {
			moving = requestAnimationFrame(function() {
				return moveSVG(svgContainer.scrollLeft, svgContainer.scrollTop, ev.clientX, ev.clientY);
			});
			svg.css("cursor", "move");
		}
		
	})
	.on("mouseup", function(ev) {
		if (chart != "node")
			return;
		if (ev.button == 0)
			confirmNodeSelection();
		else if (ev.button == 2)
			stopSVGMotion();
	})
	.on("mouseleave", function() {
		stopNodeSelection();
		if (moving)	stopSVGMotion();
	});
	
	updatePage();
	
});