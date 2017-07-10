//Variabili principali
var day = "Friday";
var chart = "node";
var data;

//Variabili per la dimensione dell'SVG
var svgContainer;
var chartWidth;
var chartHeight;

//Variabili per la visualizzazione dei nodi
var maxLinks = 10000;
var maxNodes = 250;

function createNodeChart() {
	
	nv.addGraph(function() {
			
		var nodeChart = nv.models.forceDirectedGraph()
			//Definizione della grandezza del grafico
			.width(chartWidth)
			.height(chartHeight)
			.nodeExtras(function(nodes) {
				nodes.selectAll("circle")
					//Definizione del raggio dei nodi
					.attr("r", function(d) {
						return (d.inValue + d.outValue) / 1000;
					})
					//Definizione del colore dei nodi
					.attr("style", function(d) {
						var larger = Math.max(d.inValue, d.outValue);
						var r, g;
						if (d.inValue == larger) {
							r = 255;
							g = (d.outValue * 255) / larger;
						}
						else {
							g = 255;
							r = (d.inValue * 255) / larger;
						}
						return "fill: rgb(" + Math.round(r) + "," + Math.round(g) + ",0)";
					});
				
			});
		
		nodeChart.tooltip.contentGenerator(function(d) {
			return '<h4>ID: ' + d.id + '</h4>\n<p>Comunicazioni in uscita: ' + d.outValue + '</p>\n<p>Comunicazioni in entrata: ' + d.inValue + '</p>';
		});
		
		d3.select("svg")
			.datum(data)
			.call(nodeChart);
		  
		return nodeChart;
		
    });

}

function updateSizes() {
	chartWidth = svgContainer.clientWidth;
	chartHeight = svgContainer.clientHeight;
}

function updatePage() {
	
	$("#loader").fadeIn();
	
	updateSizes();
	
	switch (chart) {
		
		case "node":
		$.get("nodeRequest", {day: day, maxLinks: maxLinks, maxNodes: maxNodes}, function(result) {
			data = JSON.parse(result);
			createNodeChart();
			$("#loader").fadeOut();
		});
		break;
		
		case "bar":
		$.get("barRequest", {day: day}, function(result) {
			
		});
		break;
		
		case "line":
		return;
	}
	
}

$(document).ready(function() {
	
	svgContainer = document.getElementById("svgContainer");
	$(window).on("resize", updateSizes);
	
	function setEvents(selector, variable) {
		var group = $(selector + " li");
		group.on("click", function(ev) {
			if (this.className.indexOf("active") != -1)
				return;
			$(this).addClass("active");
			$(group.not(this)).removeClass("active");
			window[variable] = this.dataset[variable];
			updatePage();
		});
	}
	
	setEvents(".nav-tabs", "day");
	setEvents(".nav-pills", "chart");
	
	updatePage();
	
});