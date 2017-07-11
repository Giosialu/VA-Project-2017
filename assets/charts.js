function createNodeChart() {
	
	nv.addGraph(function() {
			
		var nodeChart = nv.models.forceDirectedGraph()
			
			//Definizione della grandezza del grafico
			.width(chartWidth * 2.5)
			.height(chartHeight * 2.5)
			
			//Definizione proprietà dei nodi
			.nodeExtras(function(nodes) {
				nodes.selectAll("circle")
					
					//Raggio
					.attr("r", function(d) {
						return (d.inValue + d.outValue) / 1000;
					})
					//Stile
					.attr("style", function(d) {
						
						//Colore
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
						
						//Bordo
						var borderStr;
						var i = 0;
						while (i < selection.length && (typeof(selection[i].id) != "undefined" && selection[i].id != d.id)) {
							i++;
						}
						borderStr = (i < selection.length) ? "stroke: rgb(0, 0, 0); stroke-width: 1.4" : "stroke: rgba(50, 50, 50, 0.5); stroke-width: 1";
						
						//Totale
						return "fill: rgb(" + Math.round(r) + "," + Math.round(g) + ",0); " + borderStr;
						
					});
				
			});
		
		nodeChart.tooltip.contentGenerator(function(d) {
			return '<h4>ID: ' + d.id + '</h4>\n<p>Comunicazioni in uscita: ' + d.outValue + '</p>\n<p>Comunicazioni in entrata: ' + d.inValue + '</p>';
		});
		
		d3.select("svg")
			.attr("style", "width: 250%; height: 250%")
			.datum(data)
			.call(nodeChart);
			
		svgContainer.scrollLeft = svgContainer.scrollWidth / 3.5;
		svgContainer.scrollTop = svgContainer.scrollHeight / 3.5;
		
		updateLoaderPosition();
		
		circles = $("circle");
		for (var i = 0; i < circles.length; i++) {
			circles[i].lastTrackedStatus = (circles[i].style.stroke == "rgb(0, 0, 0)") ? "selected" : "unselected";
		}
		
		nv.utils.windowResize(nodeChart.update);
		
		return nodeChart;
		
    });

}

function createBarChart() {
	
	nv.addGraph(function() {
		
        barChart = nv.models.multiBarChart()
            .duration(300)
			.forceY([0,50000]);
		
        barChart.xAxis
            .axisLabel("Luogo e ora")
            .axisLabelDistance(5)
            .tickFormat(function(d) { 
				return d3.time.format('%H:%M')(new Date(d)); 
			});
		
        barChart.yAxis
            .axisLabel("Comunicazioni")
            .axisLabelDistance(-5)
            .tickFormat(d3.format('d'))
			.showMaxMin(false);
		
        d3.select('svg')
			.attr("style", "width: 100%; height: 100%")
            .datum(data)
            .call(barChart);
		
		updateLoaderPosition();
        nv.utils.windowResize(barChart.update);
		
        return barChart;
		
    });
	
}

function updateSizes() {
	chartWidth = svgContainer.clientWidth;
	chartHeight = svgContainer.clientHeight;
}

function updatePage() {

	updateSizes();
	
	switch (chart) {
		
		case "node":
		$("#loader").fadeIn();
		$.get("nodeRequest", {day: day, maxLinks: maxLinks, maxNodes: maxNodes}, function(result) {
			data = JSON.parse(result);
			d3.selectAll("svg > *, .nvtooltip").remove();
			createNodeChart();
			$("#loader").fadeOut();
		});
		break;
		
		case "bar":
		d3.json("assets/data/barData" + day + ".json", function(err, result) {
			if (err) throw err;
			result.forEach(function(d) {
				d.Timestamp = new Date(d.Timestamp);
			})
			data = result;
			d3.selectAll("svg > *, .nvtooltip").remove();
			createBarChart();
		});
		break;
		
		case "line":
		return;
	}
	
}