//Variabili principali
var day = "Friday";
var chart = "node";
var data;
var selection = [];
var showSelection = [];
var selectionHasArea = false;
var selectionHasDay = 6;

//Variabili per la dimensione dell'SVG
var svgContainer;
var chartWidth;
var chartHeight;

//Variabili per l'interazione con l'SVG
var mouseX;
var mouseY;
var ctrl;
var moving = false;
var mouseOnViewingInfo = false;
var selecting = false;
var selector;
var circles = [];
var rectCircles = [];
var rects = [];
var isLoading = false;

//Variabili per nodi HTML
var selectionViewer;
var viewingInfo;
var reselectButton;
var reselectContainer;
var svg;

//Variabili per la visualizzazione dei nodi
var maxLinks = 2500;
var maxNodes = 250;
var linkSizeK = 50;
var nodeSizeK = 1000;
var userSizeK = 1;
var marking = false;

//Variabili per la visualizzazione a barre
var currentBarTimeSpan = 1800000;	//Il tempo di default sono 30 minuti

//Variabili per il socket
var socket = io();
socket.on("message", function(message) {
	switch (message.subject) {
		
		case "loadingData":
		$("#loadingMessage").text(message.text);
		$("#loadingBar").css("width", message.percentage + "%");
		break;
		
		case "additionalBarData":
		currentBarTimeSpan = +message.value;
	}
});

//Altre variabili
var areaColors = {
	"Tundra Land": "PowderBlue",//"rgb(219, 238, 244)",
	"Entry Corridor": "Gainsboro",//"rgb(237, 234, 241)",
	"Kiddie Land": "PapayaWhip",//"rgb(255, 243, 203)",
	"Wet Land": "DarkSeaGreen",//"rgb(196, 213, 159)",
	"Coaster Alley": "Salmon" //"rgb(217, 149, 146)"
};
var dayNames = {
	"6": "Friday",
	"7": "Saturday",
	"8": "Sunday"
};

//Funzioni di caricamento
function setOnLoading() {
	isLoading = true;
	$(".updater").each(function(i, d) {
		d.setAttribute("disabled", "disabled");
	});
}
function removeOnLoading() {
	isLoading = false;
	$(".updater").each(function(i, d) {
		d.removeAttribute("disabled");
	});
}

//Funzione per aggiornamento delle posizioni dell'interfaccia
function updateSVGInterfacePosition() {
	$("#loader, #helpInfo").css({
		top: svgContainer.scrollTop + "px",
		left: svgContainer.scrollLeft + "px"
	});
	$("#helpOpener").css({
		top: svgContainer.scrollTop + 12 + "px",
		left: svgContainer.scrollLeft + 12 + "px"
	});
	viewingInfo.css("top", svgContainer.scrollTop + "px");
	if ($("#viewingInfoToggler").hasClass("glyphicon-arrow-left"))
		viewingInfo.css("left", "calc(" + svgContainer.scrollLeft + "px + 95%)");
	else
		viewingInfo.css("left", "calc(" + svgContainer.scrollLeft + "px + 75%)");
}

//Funzioni per lo spostamento nell'SVG
function moveSVG(startLeft, startTop, startX, startY) {
	svgContainer.scrollLeft = startLeft - (mouseX - startX);
	svgContainer.scrollTop = startTop - (mouseY - startY);
	updateSVGInterfacePosition();
	moving = requestAnimationFrame(function() {
		return moveSVG(startLeft, startTop, startX, startY);
	});
}
function stopSVGMotion() {
	cancelAnimationFrame(moving);
	moving = false;
	svg.css("cursor", "default");
}

//Aspetto
function checkViewingInfoBorderTop() {
	if ($("#viewingInfoToggler").hasClass("glyphicon-arrow-left") && showSelection.length > 0)
		$("#viewingInfo").css({
			borderTop: "1px solid #ddd",
			borderRadius: "10px 0px"
		});
	else
		$("#viewingInfo").css({
			borderTop: "",
			borderRadius: ""
		});
}

//Funzioni per il node chart
function setMarking() {
	circles.each(function(i, d) {
		var data = d.__data__;
		if (data.id == "1278894" || data.id == "839736" || data.id == "external") {
			var styleStr = d.getAttribute("style");
			d3.select(d.parentNode).insert("rect", ":first-child")
				.attr("x", "-5")
				.attr("y", "-5")
				.attr("width", "10")
				.attr("height", "10")
				.attr("style", styleStr)
				.attr("class", "rectCircle");
			$(d).attr("r", "5").css("opacity", "0");
		}
	});
}
function removeMarking() {
	circles.each(function(i, d) {
		var data = d.__data__;
		if (data.id == "1278894" || data.id == "839736" || data.id == "external") {
			$(d.previousElementSibling).remove();
			
			$(d).attr("r", function() {
				return (data.inValue + data.outValue) / nodeSizeK * userSizeK;
			})
			.css("opacity", "");
		}
	});
}