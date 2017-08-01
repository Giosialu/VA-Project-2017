

			/* NODE CHART */

			
function createNodeChart() {
	
	nv.addGraph(function() {
			
		var nodeChart = nv.models.forceDirectedGraph()
			
			//Definizione della grandezza del grafico
			.charge(-80)
			.friction(0.8)
			.linkDist(60)
			.width(chartWidth * 3)
			.height(chartHeight * 3)
			
			//Definizione proprietà dei nodi
			.nodeExtras(function(nodes) {
				nodes.selectAll("circle")
					
					//Raggio
					.attr("r", function(d) {
						return (d.inValue + d.outValue) / nodeSizeK * userSizeK;
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
				

			})
			
			//Definizione proprietà dei link
			.linkExtras(function(links) {
				links.attr("style", function(d) {
					return "stroke-width: " + d.value / linkSizeK * (Math.sqrt(userSizeK)) + ";"
				});
			});
		
		//Tooltip
		nodeChart.tooltip.contentGenerator(function(d) {
			return '<h4>ID: ' + d.id + '</h4>\n<p>Outbound communications: ' + d.outValue + '</p>\n<p>Inbound communications: ' + d.inValue + '</p>';
		});
		
		//Creazione del grafico
		d3.select("svg")
			.attr("style", "width: 300%; height: 300%")
			.datum(data)
			.call(nodeChart);
		
		//Operazioni preliminari dell'interfaccia
		svgContainer.scrollLeft = chartWidth;
		svgContainer.scrollTop = chartHeight;
		updateSVGInterfacePosition();
		
		//Operazioni preliminari sui nodi
		circles = $("circle");
		if (marking)
			setMarking();
		checkNodeSelection();
		
		return nodeChart;
		
    });

}


			/* BAR CHART */

	
function createBarChart() {
	
	nv.addGraph(function() {
		
		//Basi del grafico
        barChart = nv.models.multiBarChart()
			.width(chartWidth * 0.96)
			.height(chartHeight)
            .duration(300);
		
		//Scala con range fisso per le visualizzazioni di default
		if (showSelection.length == 0)
			barChart.forceY([0,50000]);
		
		//Definizione delle assi
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
		
		//Tooltip
		barChart.tooltip.contentGenerator(function(d) {
			var html = "";
			var data = d.data;
			var startDate = new Date(data.x);
			var endDate = new Date(startDate);
			endDate.setTime(endDate.getTime() + currentBarTimeSpan);
			html += '<h4>'+ d3.time.format("%H:%M")(startDate) + "-" + d3.time.format("%H:%M")(endDate) + ', ' + data.key + '</h4>\n';
			html += '<p>Outbound communications:' + data.y + '</p>';
			return html;
		});
		
		//Creazione del grafico
        d3.select('svg')
			.attr("style", "width: 100%; height: 100%")
            .datum(data)
            .call(barChart);
		
		//Operazioni preliminari dell'interfaccia
		svgContainer.scrollLeft = 0;
		svgContainer.scrollTop = 0;
		updateSVGInterfacePosition();
		
		//Handling degli eventi di selezione delle barre
		barChart.dispatch.on("renderEnd", function() {
			rects = $("rect.nv-bar");
			rects.off("click", selectBars).on("click", selectBars);	//Poiché attraverso l'interazione gli elementi che compongono il grafico cambiano
			checkBarSelection();
		});
		
        return barChart;
		
    });
	
}


			/* PATTERN CHART */

	
function createPatternChart() {
		
	nv.addGraph(function() {
		
					//Definisco la grandezza del grafico e gli estremi delle assi
					
		//Riguardo le ordinate	
		var startY = 0;
		var endY = d3.max(patternCoords) + 40;
		patternHeight = endY;
		
		//Riguardo le ascisse
		if (!selectionHasArea) {
			var minDate = new Date("2014-06-01T06:00:00.000Z");
			var maxDate = new Date("2014-06-01T22:00:00.000Z");
			minDate.setDate(selectionHasDay);
			maxDate.setDate(selectionHasDay + 1);	//Essendo la mezzanotte, deve essere del giorno dopo
		}
		else {
			var startDates = [];
			var endDates = [];
			for (var i = 0; i < showSelection.length; i++) {
				d = showSelection[i];
				if (d.timestamp == undefined)
					continue;
				
				var tempDate = new Date(d.timestamp);
				startDates.push(tempDate);
				var endDate = new Date(tempDate);
				endDate.setTime(endDate.getTime() + d.timeSpan);
				endDates.push(endDate);
			}
			var minDate = new Date(d3.min(startDates));
			var maxDate = new Date(d3.max(endDates));
		}
		var startX = new Date(minDate);
		var endX = new Date(maxDate);
		patternWidth = (maxDate.getTime() - minDate.getTime()) / 2075;
		var xValues = [];
		for (var i = new Date(startX); i <= endX; i.setTime(i.getTime() + 300000)) {
			xValues.push(i.getTime());
		}
				
					//Avvio la creazione del grafico
		
		//Le basi
        patternChart = nv.models.scatterChart()
			.margin({top: 25, right: 70, bottom: 50, left: 70})
			.width(patternWidth)
			.height(patternHeight)
            .duration(300)
			.showLegend(false)
			.forceX([startX, endX])
			.forceY([startY, endY])
			.pointRange([40, 40])
			.x(function(d) {
				return new Date(d.x);
			})
			.y(function(d) {
				return patternScale(d.y);
			});
		
		//Le assi
		patternChart.xAxis
			.tickValues(xValues)
            .tickFormat(function(x) {
				return d3.time.format('%H:%M')(new Date(x)); 
			});	
        patternChart.yAxis
			.showMaxMin(false)
			.tickValues(patternCoords)
			.tickFormat(function(y) {
				return invertPatternScale(y);
			});
		
		//Il tooltip
		patternChart.tooltip.contentGenerator(function(d) {
			var html = "";
			d = d.point;
			html += "ID " + d.id + " ";
			html += (d.shape == "triangle-up") ? "sending a message to ID " : "receiving a message from ID ";
			html += d.target + " at " + d3.time.format("%H:%M:%S")(d.x);
			html += (d.shape == "triangle-up") ? " from " + d.location + "." : ".";
			return html;
		});
		
		//La creazione del grafico
		d3.select('svg')
			.attr("style", "width: " + patternWidth + "px; height: " + patternHeight + "px")
            .datum(data)
            .call(patternChart);
		
		//Aggiungo le linee
		var linesGroup = d3.select("svg").insert("g", ":first-child").attr("id", "lines-container");
		for (var i = 0; i < data.length; i++) {
			var values = data[i].values;
			for (var j = 0; j < values.length; j += 2) {
				var d = values[j];
				var x = patternChart.xAxis.scale()(new Date(d.x))  + patternChart.margin().left;
				
				linesGroup.append("line")
					.attr("class", "patternLine")
					.attr("x1", x)	
					.attr("x2", x)
					.attr("y1", function() {
						return patternChart.yAxis.scale()(patternScale(d.y))  + patternChart.margin().top;
					})
					.attr("y2", function() {
						return patternChart.yAxis.scale()(patternScale(values[j + 1].y)) + patternChart.margin().top;
					});
			}
		}
		
		//Aggiungo i colori
		$(".nv-group").each(function(i, d) {
			var color = areaColors[d.__data__.key];
			$(d.children).each(function(j, e) {
				var shape = e.__data__[0].shape;
				if (shape == "triangle-up")
					$(e).addClass("sender")
					.css({
						stroke: color,
						strokeWidth: "0.5px",
						fill: color,
						fillOpacity: "1"
					});
				if (shape == "triangle-down")
					$(e).addClass("receiver")
					.css({
						stroke: "black",
						strokeWidth: "0.5px",
						fill: "white",
						fillOpacity: "1"
					});
			});
		});
		
		//Operazioni preliminari dell'interfaccia
		svgContainer.scrollLeft = 0;
		svgContainer.scrollTop = 0;
		updateSVGInterfacePosition();
		
		//Prendo tutti i triangoli poiché possibili argomenti nella funzione di zoom
		triangles = $(".nv-point");
		
        return patternChart;
    });
	
	
}


			/* AGGIORNAMENTO DELLE DIMENSIONI */

	
function updateSizes() {
	chartWidth = svgContainer.clientWidth;
	chartHeight = svgContainer.clientHeight;
	selectionViewer.scrollTop = selectionViewer.scrollHeight - selectionViewer.clientHeight;
}


			/* AGGIORNAMENTO DELL'SVG */

function createGraph(result, graphFunction) {
	data = result;
	d3.selectAll("svg > *, .nvtooltip").remove();
	svg.currentScale = 1;
	graphFunction.call();
	updateViewingInfo();
	$("#loader").fadeOut();
	removeOnLoading();
}
	
function updatePage() {
	
	setOnLoading();
	$("#loadingBar").css("width", "0%");
	$("#loader").fadeIn();
	updateSizes();
	
	switch (chart) {
		
		case "node":
		$("#nodeOptions").slideDown("fast");
		$("#helpOpener").fadeIn("fast");
		$("#helpInfo > div:first-child").show();
		$.get("nodeRequest", {day: day, maxLinks: maxLinks, maxNodes: maxNodes, selection: JSON.stringify(showSelection), selectionHasArea: selectionHasArea}, function(result) {
			createGraph(result, createNodeChart);
		});
		break;
		
		case "bar":
		$("#nodeOptions").slideUp("fast");
		$("#helpOpener").fadeOut("fast");
		$.get("barRequest", {day: day, selection: JSON.stringify(showSelection), selectionHasArea: selectionHasArea, selectionHasDay: selectionHasDay}, function(result) {
			createGraph(result, createBarChart);
		});
		break;
		
		case "pattern":
		$("#nodeOptions").slideUp("fast");
		$("#helpOpener").fadeIn("fast");
		$("#helpInfo > div:first-child").hide();
		$.get("patternRequest", {day: day, selection: JSON.stringify(showSelection)}, function(result) {
			createGraph(result, createPatternChart);
		});
		
	}
}