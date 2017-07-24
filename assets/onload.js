$(document).ready(function() {
	
	//Nodi HTML ed eventi generici
	svgContainer = document.getElementById("svgContainer");
	selectionViewer = document.getElementById("selectionViewer");
	reselectButton = document.getElementById("reselect");
	reselectContainer = $("#reselectContainer");
	viewingInfo = $("#viewingInfo");
	svg = $("svg");
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
	
	
				/* SPECIFICHE PER NODE CHART */
	
	
	//Personalizzazione del node chart
	
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
			if (marking && (d.id == "1278894" || d.id == "839736" || d.id == "external"))
				return 5;
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
	$("#markSpecial").on("change", function() {
		marking = this.checked;
		if (marking) 
			setMarking();
		else
			removeMarking();
		rectCircles = $(".rectCircle");
	});
	
	
	//Legenda comandi mouse
	
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
		
		showSelection = selection;
		
		//Aspetto dell'interfaccia per ogni query
		svgContainer.style.borderRadius = "0px 0px 4px 4px";
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
				day = dayNames[n];
				$("[data-day='" + day + "']").addClass("active").fadeIn();
			}
			
		}
		//Caso di soli nodi
		else {
			selectionHasArea = false;
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
		selection = showSelection;
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
		
		if (chart != "node" || mouseOnViewingInfo)
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
	
	//Rilascio del click
	.on("mouseup", function(ev) {
		if (chart != "node")
			return;
		if (ev.button == 0)
			confirmNodeSelection();
		else if (ev.button == 2)
			stopSVGMotion();
	})
	
	//Il mouse esce dal riquadro
	.on("mouseleave", function(ev) {
		stopNodeSelection();
		if (moving)	stopSVGMotion();
	});
	
	//Rotella
	svgContainer.addEventListener("wheel", function(ev) {
		
		if (chart != "node" || mouseOnViewingInfo)
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
		updateSVGInterfacePosition();
	});
	
				/* AVVIO DELL'APPLICAZIONE */
	
	updatePage();
	
});