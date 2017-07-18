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
var isLoading = false;

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
var maxLinks = 2500;
var maxNodes = 250;
var linkSizeK = 50;
var nodeSizeK = 1000;
var userSizeK = 1;

//Variabili per il socket
var socket = io();
socket.on("message", function(message) {
	if (message.subject == "loadingData") {
		$("#loadingMessage").text(message.text);
		$("#loadingBar").css("width", message.percentage + "%");
	}
});

$(document).ready(function() {
	
	//Pulsante sulle informazioni
	$("h1").on("mouseenter", function() {
		$("#infoOpener").css("opacity", "1");
	})
	.on("mouseleave", function() {
		$("#infoOpener").css("opacity", "0");
	});
	
	//Pulsanti dei menù di navigazione
	function setNavEvents(selector, variable) {
		var group = $(selector);
		group.on("click", function(ev) {
			
			if (isLoading)
				return;
			if ($(this).hasClass("active"))
				return;
			
			$(this).addClass("active");
			$(group.not(this)).removeClass("active");
			window[variable] = this.dataset[variable];
			
			if (variable == "chart") {
				if (this.dataset[variable] == "node")
					$("#nodeOptions").slideDown("fast");
				else
					$("#nodeOptions").slideUp("fast");
			}
				
			updatePage();
		});
	}
	
	setNavEvents("[data-day]", "day");
	setNavEvents("[data-chart]", "chart");
	
	//Pulsanti per l'interfaccia del nodeChart
	function updateNodeOptions(obj, variable) {
		window[variable] = parseInt(obj.value);
		obj.nextElementSibling.innerHTML = window[variable];
	}
	
	function updateNodeChart() {
		if (isLoading)
			return;
		setOnLoading()
		$.get("updateNodeChart", {maxLinks: maxLinks, maxNodes: maxNodes}, function(result) {
			data = result;
			d3.selectAll("svg > *, .nvtooltip").remove();
			svg[0].currentScale = 1;
			createNodeChart();
			removeOnLoading();
		});
	}
	
	function updateNodeView(obj) {
		userSizeK = Number(obj.value);
		obj.nextElementSibling.innerHTML = userSizeK;
		d3.selectAll("circle").attr("r", function(d) {
			return (d.inValue + d.outValue) / nodeSizeK * userSizeK;
		});
		d3.selectAll("line").attr("style", function(d) {
			return "stroke-width: " + d.value / linkSizeK * (Math.sqrt(userSizeK)) + ";"
		});

	}
	
	$("#maxNodes").on("input", function() {
		return updateNodeOptions(this, "maxNodes");
	});
	$("#maxLinks").on("input", function() {
		return updateNodeOptions(this, "maxLinks");
	});
	$("#maxNodes, #maxLinks").on("change", updateNodeChart);
	$("#size").on("input", function() {
		return updateNodeView(this);
	});
		
	//Pulsanti per l'invio della selezione
	function sendSelection(chartString) {
		
		if (isLoading)
			return;
		
		showSelection = selection;
		
		//Aspetto dell'interfaccia per ogni query
		svgContainer.style.borderRadius = "0px 0px 4px 4px";
		$("#selectionTab").fadeIn().addClass("active");
		$(".nav-pills li").removeClass("active");
		$("li[data-chart='" + chartString + "']").addClass("active");
		chart = chartString;
		if (chartString == "node")
			$("#nodeOptions").slideDown("fast");
		else 
			$("#nodeOptions").slideUp("fast");
		
		//Aspetto dell'interfaccia per le query con aree
		var i = 0;
		while (i < selection.length && selection[i].area == undefined) {
			i++;
		}
		if (i < selection.length) {
			linkSizeK = 0;
			nodeSizeK = 0;
			for (var i = 0; i < selection.length; i++) {
				if (selection[i].timestamp != undefined)
					linkSizeK += 5;
					nodeSizeK += 100;
			}
			$("[data-day]").removeClass("active").fadeOut();
			var i = 0;
			while (selection[i].timestamp == undefined) {
				i++;
			}
			var n = selection[i].timestamp[9];
			while (i < selection.length && (selection[i].timestamp == undefined || selection[i].timestamp[9] == n)) {
				i++;
			}
			if (i == selection.length) {
				day = dayNames[n];
				$("[data-day='" + day + "']").addClass("active").fadeIn();
			}
		}
		else {
			linkSizeK = 50;
			nodeSizeK = 1000;
			$("[data-day]").removeClass("active").fadeIn();
			$("[data-day='" + day + "']").addClass("active");
		}
		
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
		if (isLoading)
			return;
		showSelection = [];
		svgContainer.style.borderRadius = "0px 4px 4px 4px";
		linkSizeK = 50;
		nodeSizeK = 1000;
		$("[data-day]").removeClass("active").fadeIn();
		$("[data-day='" + day + "']").addClass("active");
		$("#selectionTab").fadeOut().removeClass("active");
		updatePage();
	});
	
	//Dimensioni dell'SVG
	svgContainer = document.getElementById("svgContainer");
	$(window).on("resize", updateSizes);
	
	//Interazioni con l'SVG
	selectionViewer = $("#selectionViewer");
	svg = $("svg");
	$(svgContainer)
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
	.on("mouseleave", function(ev) {
		stopNodeSelection();
		if (moving)	stopSVGMotion();
	});
	svgContainer.addEventListener("wheel", function(ev) {
		
		if (chart != "node")
			return;
		ev.preventDefault();
		
		//Zoom
		var startPos = circles[0].getBoundingClientRect();
		svg[0].currentScale += -ev.deltaY / 2000;
		if (svg[0].currentScale < 0.5)
			svg[0].currentScale = 0.5;
		if (svg[0].currentScale > 2.5)
			svg[0].currentScale = 2.5;
		var endPos = circles[0].getBoundingClientRect();
		
		//Adattamento dei riquadri
		svgContainer.scrollLeft += (endPos.left - startPos.left);
		svgContainer.scrollTop += (endPos.top - startPos.top);
		var k = (svg[0].currentScale >= 1) ? svg[0].currentScale : (2 - svg[0].currentScale) * 2;
		var n = 300 * k;
		svg.attr("style", "width: " + n + "%; height: " + n + "%;");
		updateLoaderPosition();
	});
	
	updatePage();
	
});