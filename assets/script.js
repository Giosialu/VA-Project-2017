//Variabili principali
var day = "Friday";
var chart = "node";
var data;

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
var selection = [];
var selectionViewer;

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

function addNode(node) {
	$(node).css({
		stroke: "rgb(0, 0, 0)",
		strokeWidth: "1.4"
	});
	selection.push({
		id: node.__data__.id
	});
	updateSelectionViewer();
}

function removeNode(node, index) {
	$(node).css({
		stroke: "rgba(50, 50, 50, 0.5)",
		strokeWidth: "1"
	});
	selection.splice(index, 1);
	updateSelectionViewer();
}

function selectNodes(originX, originY, startX, startY) {
	
	//Disegno del rettangolo
	var width = mouseX - startX;
	var height = mouseY - startY;
	if (width < 0) {
		selector.attr("x", originX + width);
		width = Math.abs(width);
	}
	if (height < 0) {
		selector.attr("y", originY + height);
		height = Math.abs(height);
	}
	selector.attr("width", width).attr("height", height);
	
	//Selezione	
	var rectCoords = selector[0][0].getBoundingClientRect();
	for (var i = 0; i < circles.length; i++) {
		
		var circCoords = circles[i].getBoundingClientRect();
		
		//Individuazione del nodo nella selezione se presente
		var k = 0;
		while (k < selection.length && (typeof(selection[k].id) != "undefined" && selection[k].id != circles[i].__data__.id)) {
			k++;
		}
		
		//Caso di selezione multipla
		if (ctrl) {
			if (circCoords.top > rectCoords.top && circCoords.bottom < rectCoords.bottom && circCoords.left > rectCoords.left && circCoords.right < rectCoords.right) {
				if (k == selection.length && circles[i].lastTrackedStatus == "unselected")
					addNode(circles[i]);
				else if (k < selection.length && circles[i].lastTrackedStatus == "selected")
					removeNode(circles[i], k);
			}
		}
		
		//Caso di selezione semplice
		else {
			if (circCoords.top > rectCoords.top && circCoords.bottom < rectCoords.bottom && circCoords.left > rectCoords.left && circCoords.right < rectCoords.right) {
				if (k == selection.length)
					addNode(circles[i]);
			}
			else
				removeNode(circles[i], k);
		}
	}
	
	//Ripetizione per frame
	selecting = requestAnimationFrame(function() {
		return selectNodes(originX, originY, startX, startY);
	});
	
}

function stopNodeSelection() {
	if (selecting) {
		cancelAnimationFrame(selecting);
		selecting = false;
		selector.remove();
	}
}

function updateSelectionViewer() {
	
	//Nodi
	var html = "";
	for (var i = 0; i < selection.length; i++) {
		if (typeof(selection[i].id) != "undefined")
			html += "<span class='selectionLabel'>ID " + selection[i].id + "</span>";
		else
			html += "<span class='selectionLabel'>" + selection[i].area + " tra le ";
	}
	selectionViewer.html(html);
	
	//Aspetto
	if (selectionViewer[0].scrollHeight > selectionViewer[0].clientHeight)
		selectionViewer.css({borderTop: "1px solid #ddd"});
	else
		selectionViewer.css({borderTop: "none"});
	
}

//Variabili per la visualizzazione dei nodi
var maxLinks = 10000;
var maxNodes = 250;

$(document).ready(function() {
	
	//Interazione con pulsanti dell'interfaccia
	function setEvents(selector, variable) {
		var group = $(selector + " li");
		group.on("click", function(ev) {
			if ($(this).hasClass("active"))
				return;
			$(this).addClass("active");
			$(group.not(this)).removeClass("active");
			window[variable] = this.dataset[variable];
			updatePage();
		});
	}
	
	setEvents(".nav-tabs", "day");
	setEvents(".nav-pills", "chart");
	
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
		if (ev.button == 0) {
			svg.css("cursor", "default");
			
			//Click su nodo
			for (var i = 0; i < circles.length; i++) {
				var circCoords = circles[i].getBoundingClientRect();
				if (ev.clientX > circCoords.left && ev.clientX < circCoords.right && ev.clientY > circCoords.top && ev.clientY < circCoords.bottom) {
					if (ev.ctrlKey) {
						var k = 0;
						while (k < selection.length && (typeof(selection[k].id) != "undefined" && selection[k].id != circles[i].__data__.id)) {
							k++;
						}
						if (k == selection.length)
							addNode(circles[i]);
						else
							removeNode(circles[i], k);
					}
					else {
						selection = [];
						circles.not(circles[i]).css({
							stroke: "rgba(50, 50, 50, 0.5)",
							strokeWidth: "1"
						});
						addNode(circles[i]);
						updateSelectionViewer();
					}
					return;
				}
			}
			
			//Selezione
			ctrl = ev.ctrlKey;
			selector = d3.select("svg").append("rect").attr("id", "nodeSelector").attr("x", ev.offsetX).attr("y", ev.offsetY);
			selecting = requestAnimationFrame(function() {
				return selectNodes(ev.offsetX, ev.offsetY, ev.clientX, ev.clientY);
			});
			
		//Right Click
		} else if (ev.button == 2) {
			moving = requestAnimationFrame(function() {
				return moveSVG(svgContainer.scrollLeft, svgContainer.scrollTop, ev.clientX, ev.clientY);
			});
			svg.css("cursor", "move");
		}
		
	})
	.on("mouseup", function(ev) {
		if (chart != "node")
			return;
		if (ev.button == 0) { 
			for (var i = 0; i < circles.length; i++) {
				circles[i].lastTrackedStatus = (circles[i].style.stroke == "rgb(0, 0, 0)") ? "selected" : "unselected";
			}
			stopNodeSelection();
		} else if (ev.button == 2)
			stopSVGMotion();
	})
	.on("mouseleave", function() {
		stopNodeSelection();
		if (moving)	stopSVGMotion();
	});
	
	updatePage();
	
});