$(document).ready(function() {
	
	//Nodi HTML ed eventi generici
	svgContainer = document.getElementById("svgContainer");
	selectionViewer = document.getElementById("selectionViewer");
	reselectButton = document.getElementById("reselect");
	svg = document.getElementById("svg");
	reselectContainer = $("#reselectContainer");
	viewingInfo = $("#viewingInfo");
	$(window).on("resize", updateSizes);
	
	
				/* PRINCIPALI PULSANTI DELL'INTERFACCIA */
				
				
	//Informazioni sul sito
	$("h1").on("mouseenter", function() {
		$("#infoOpener").css("opacity", "1");
	})
	.on("mouseleave", function() {
		$("#infoOpener").css("opacity", "0");
	});
	
	//Scelta del giorno e del grafico
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
			updatePage();
		});
	}
	setNavEvents("[data-day]", "day");
	setNavEvents("[data-chart]", "chart");
	
	//Apertura e chiusura del riquadro visualizzazione corrente
	$("#viewingInfoToggler").on("click", function() {
		if ($(this).hasClass("glyphicon-arrow-left")) {
			$(this).removeClass("glyphicon-arrow-left").addClass("glyphicon-arrow-right");
			viewingInfo.css("transition", "width 0.25s, left 0.25s");
			viewingInfo.css({
				left: "calc(" + svgContainer.scrollLeft + "px + 75%)",
				width: "25%",
				overflowY: ""
			});
			setTimeout(function() {
				viewingInfo.css("transition", "");
			}, 250);
			$("#viewingInfo *").css({
				transition: "opacity 0.25s 0.15s",
				opacity: "1"
			});
		}
		else {
			$(this).removeClass("glyphicon-arrow-right").addClass("glyphicon-arrow-left");
			viewingInfo.css("transition", "width 0.25s 0.1s, left 0.25s 0.1s");
			viewingInfo.css({
				left: "calc(" + svgContainer.scrollLeft + "px + 95%)",
				width: "5%",
				overflowY: "hidden"
			});
			setTimeout(function() {
				viewingInfo.css("transition", "");
			}, 400);
			$("#viewingInfo *").css({
				transition: "opacity 0.25s",
				opacity: "0"
			});
		}
		checkViewingInfoBorderTop();
	});
	
	//Tengo memoria del mouse su viewingInfo
	viewingInfo.on("mouseenter", function() {
		mouseOnViewingInfo = true;
	})
	.on("mouseleave", function() {
		mouseOnViewingInfo = false;
	});
	
	
				/* INTERFACCIA DEL NODE CHART */
	
	
	//Aggiornamento quantità massima di nodi ed archi
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
			svg.currentScale = 1;
			createNodeChart();
			removeOnLoading();
		});
	}
	$("#maxNodes").on("input", function() {
		return updateNodeOptions(this, "maxNodes");
	});
	$("#maxLinks").on("input", function() {
		return updateNodeOptions(this, "maxLinks");
	});
	$("#maxNodes, #maxLinks").on("change", updateNodeChart);
	
	//Modifica alle dimensioni di nodi ed archi
	function updateNodeView(obj) {
		userSizeK = Number(obj.value);
		obj.nextElementSibling.innerHTML = userSizeK;
		d3.selectAll("circle").attr("r", function(d) {
			if (marking && (d.id == "1278894" || d.id == "839736" || d.id == "external"))
				return 5;
			return (d.inValue + d.outValue) / nodeSizeK * userSizeK;
		});
		d3.selectAll("line").attr("style", function(d) {
			return "stroke-width: " + d.value / linkSizeK * (Math.sqrt(userSizeK)) + ";"
		});
	}
	$("#size").on("input", function() {
		return updateNodeView(this);
	});
	
	//Marking dei nodi speciali
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
	$("#markSpecial").on("change", function() {
		marking = this.checked;
		if (marking) 
			setMarking();
		else
			removeMarking();
		rectCircles = $(".rectCircle");
	});
	
	
				/* LEGENDA COMANDI MOUSE */
	
	
	$("#helpOpener").on("mouseenter", function() {
		$("#helpInfo").css("width", "12%");
	})
	.on("mouseleave", function() {
		$("#helpInfo").css("width", "0px");
	});
	
	
				/* VISUALIZZAZIONI DA SELEZIONE */
	
	
		//Invio della selezione
	
	function sendSelection(chartString) {
		
		if (isLoading)
			return;
		
		showSelection = [];
		for (var i = 0; i < selection.length; i++) {
			showSelection.push(selection[i]);
		}
		
		//Aspetto dell'interfaccia per ogni query
		svgContainer.style.borderRadius = "0px 0px 4px 4px";
		$("[data-chart='pattern']").fadeIn();
		$("#selectionTab").fadeIn().addClass("active");
		$("li[data-chart]").removeClass("active");
		$("li[data-chart='" + chartString + "']").addClass("active");
		chart = chartString;
		
		//Aspetto dell'interfaccia per le query con aree
		var i = 0;
		while (i < selection.length && selection[i].area == undefined) {
			i++;
		}
		//Caso di presenza aree
		if (i < selection.length) {
			selectionHasArea = true;
			
			//Riguardo la scala
			linkSizeK = 0;
			nodeSizeK = 0;
			for (var i = 0; i < selection.length; i++) {
				if (selection[i].timestamp != undefined)
					linkSizeK += 5;
					nodeSizeK += 100;
			}
			
			//Riguardo la giornata
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
				selectionHasDay = n;
				day = dayNames[n];
				$("[data-day='" + day + "']").addClass("active").fadeIn();
			}
			else
				selectionHasDay = 1;	//Code for multiple days in selection
			
		}
		//Caso di soli nodi
		else {
			selectionHasArea = false;
			selectionHasDay = dayNumbers[day];
			linkSizeK = 50;
			nodeSizeK = 1000;
			$("[data-day]").removeClass("active").fadeIn();
			$("[data-day='" + day + "']").addClass("active");
		}
		
		checkViewingInfoBorderTop();
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
	
		//Chiusura della selezione
	
	$("#closeSelection").on("click", function() {
		if (isLoading)
			return;
		showSelection = [];
		$("[data-chart='pattern']").fadeOut();
		if (chart == "pattern") {
			chart = "node";
			$("[data-chart='pattern']").removeClass("active");
			$("[data-chart='node']").addClass("active");
		}
		svgContainer.style.borderRadius = "0px 4px 4px 4px";
		linkSizeK = 50;
		nodeSizeK = 1000;
		$("[data-day]").removeClass("active").fadeIn();
		$("[data-day='" + day + "']").addClass("active");
		$("#selectionTab").fadeOut().removeClass("active");
		checkViewingInfoBorderTop();
		updatePage();
	});
	
		//Riselezione
	
	reselectButton.addEventListener("click", function() {
		selection = [];
		for (var i = 0; i < showSelection.length; i++) {
			selection.push(showSelection[i]);
		}
		updateSelectionViewer();
		circles.each(function(i, d) {
			var j = 0;
			while (j < selection.length && selection[j].id != d.__data__.id) {
				j++;
			}
			if (j < selection.length) {
				$(d).css({
					stroke: "rgba(0, 0, 0, 0.9)",
					strokeWidth: "1.3"
				});
				if (d.previousElementSibling != null)
					$(d.previousElementSibling).css({
						stroke: "rgba(0, 0, 0, 0.9)",
						strokeWidth: "1.3"
					});
			}
			else {
				$(d).css({
					stroke: "rgba(50, 50, 50, 0.5)",
					strokeWidth: "1"
				});
				if (d.previousElementSibling != null)
					$(d.previousElementSibling).css({
						stroke: "rgba(50, 50, 50, 0.5)",
						strokeWidth: "1"
					});
			}
		});			
		checkNodeSelection();	//Assign lastTrackedStatus variable
		if (rects.length == 0)
			return;
		$(rects).css({
			stroke: "",
			strokeWidth: "",
			strokeOpacity: ""
		});
		checkBarSelection();	//Assigns border to selected bars
	});
	
	
				/* INTERAZIONE CON IL RIQUADRO SVG */
				
				
	$(svgContainer)
	
	//Elimino il menù del tasto destro
	.on("contextmenu", function() {
		if (!mouseOnViewingInfo)
			return false;
	})
	
	//Tengo traccia della posizione del mouse
	.on("mousemove", function(ev) {
		mouseX = ev.clientX;
		mouseY = ev.clientY;
	})
	
	//Click
	.on("mousedown", function(ev) {
		
		if (mouseOnViewingInfo)
			return;
		
		//Left Click
		if (ev.button == 0 && chart == "node")
			startNodeSelection(ev);

		//Right Click
		else if (ev.button == 2 && (chart == "node" || chart == "pattern")) {
			moving = requestAnimationFrame(function() {
				return moveSVG(svgContainer.scrollLeft, svgContainer.scrollTop, ev.clientX, ev.clientY);
			});
			svg.style.cursor = "move";
		}
		
	})
	
	//Rilascio del click
	.on("mouseup", function(ev) {
		if (ev.button == 0 && chart == "node")
			confirmNodeSelection();
		else if (ev.button == 2 && (chart == "node" || chart == "pattern"))
			stopSVGMotion();
	})
	
	//Il mouse esce dal riquadro
	.on("mouseleave", function(ev) {
		stopNodeSelection();
		if (moving)	stopSVGMotion();
	});
	
	//Rotella
	svgContainer.addEventListener("wheel", function(ev) {
		
		if (chart == "bar" || mouseOnViewingInfo)
			return;
		ev.preventDefault();
		
		//Zoom
		var point = findClosest((chart == "node") ? circles : triangles);
		var startPos = point.getBoundingClientRect();
		svg.currentScale += -ev.deltaY / 2000;
		if (svg.currentScale < 0.5)
			svg.currentScale = 0.5;
		if (svg.currentScale > 2.5)
			svg.currentScale = 2.5;
		var endPos = point.getBoundingClientRect();
		
		//Adattamento dei riquadri
		svgContainer.scrollLeft += (endPos.left - startPos.left);
		svgContainer.scrollTop += (endPos.top - startPos.top);
		var k = (svg.currentScale >= 1) ? svg.currentScale : (2 - svg.currentScale) * 2;
		if (chart == "node")
			$(svg).attr("style", "width: " + 300 * k + "%; height: " + 300 * k + "%;");
		else
			$(svg).attr("style", "width: " + patternWidth * k + "px; height: " + patternHeight * k + "px;");
		updateSVGInterfacePosition();
	});
	
				/* AVVIO DELL'APPLICAZIONE */
	
	updatePage();
	
});