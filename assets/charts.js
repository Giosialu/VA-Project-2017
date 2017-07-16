function createNodeChart() {
	
	nv.addGraph(function() {
			
		var nodeChart = nv.models.forceDirectedGraph()
			
			//Definizione della grandezza del grafico
			.charge(-80)
			.friction(0.8)
			.linkDist(60)
			.width(chartWidth)
			.height(chartHeight)
			
			
			
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
						while (i < selection.length && selection[i].id != d.id) {
							i++;
						}
						borderStr = (i < selection.length) ? "stroke: rgba(0, 0, 0, 0.9); stroke-width: 1.3" : "stroke: rgba(50, 50, 50, 0.5); stroke-width: 1";
						
						//Totale
						return "fill: rgb(" + Math.round(r) + "," + Math.round(g) + ",0); " + borderStr;
						
					});
				

			});
		
		nodeChart.tooltip.contentGenerator(function(d) {
			return '<h4>ID: ' + d.id + '</h4>\n<p>Outbound communications: ' + d.outValue + '</p>\n<p>Inbound communications: ' + d.inValue + '</p>';
		});
		
		d3.select("svg")
			.attr("style", "width: 300%; height: 300%")
			.datum(data)
			.call(nodeChart);
			
		svgContainer.scrollLeft = chartWidth / 3;
		svgContainer.scrollTop = chartHeight / 3;
		
		updateLoaderPosition();
		nv.utils.windowResize(nodeChart.update);
		
		circles = $("circle");
		
		checkNodeSelection();
		
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
			
		barChart.tooltip.contentGenerator(function(d) {
			var html = "";
			var data = d.data;
			var startDate = new Date(data.x);
			var endDate = new Date(startDate);
			endDate.setMinutes(endDate.getMinutes() + 30);
			html += '<h4>'+ d3.time.format("%H:%M")(startDate) + "-" + d3.time.format("%H:%M")(endDate) + ', ' + data.key + '</h4>\n';
			html += '<p>Outbound communications:' + data.y + '</p>';
			return html;
		});
		
        d3.select('svg')
			.attr("style", "width: 100%; height: 100%")
            .datum(data)
            .call(barChart);
		
		updateLoaderPosition();
        nv.utils.windowResize(barChart.update);
		
		barChart.dispatch.on("renderEnd", function() {
			//Attraverso l'interazione nuove barre vengono di volta in volta create, aggiornate od eliminate, di conseguenza eseguiamo questo:
			rects = $("rect.nv-bar");
			rects.off("click", selectBars).on("click", selectBars);
			checkBarSelection();
		});
		
        return barChart;
		
    });
	
}

function updateSizes() {
	chartWidth = svgContainer.clientWidth * 3;
	chartHeight = svgContainer.clientHeight * 3;
	selectionViewer[0].scrollTop = selectionViewer[0].scrollHeight - selectionViewer[0].clientHeight;
}

function updatePage() {

	updateSizes();
	
	switch (chart) {
		
		case "node":
		$("#loader").fadeIn();
		$.get("nodeRequest", {day: day, maxLinks: maxLinks, maxNodes: maxNodes, selection: JSON.stringify(showSelection)}, function(result) {
			data = result;
			d3.selectAll("svg > *, .nvtooltip").remove();
			svg[0].currentScale = 1;
			createNodeChart();
			$("#loader").fadeOut();
		});
		break;
		
		case "bar":
		//Direi di passare al server anche qui, così aggiungiamo la visualizzazione della selezione
		d3.json("assets/data/barData" + day + ".json", function(err, result) {
			if (err) throw err;
			data = result;
			d3.selectAll("svg > *, .nvtooltip").remove();
			svg[0].currentScale = 1;
			createBarChart();
		});
		break;
		
		case "pattern":
		return;
	}
	
}