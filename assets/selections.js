			/* NODI */

//Aggiungere un nodo alla selezione
function addNode(node) {
	$(node).css({
		stroke: "rgba(0, 0, 0, 0.9)",
		strokeWidth: "1.3"
	});
	if (node.previousElementSibling != null)
	$(node.previousElementSibling).css({
		stroke: "rgba(0, 0, 0, 0.9)",
		strokeWidth: "1.3"
	});
	selection.push({
		id: node.__data__.id
	});
	updateSelectionViewer();
}

//Rimuovere un nodo dalla selezione
function removeNode(node, index) {
	$(node).css({
		stroke: "rgba(50, 50, 50, 0.5)",
		strokeWidth: "1"
	});
	if (node.previousElementSibling != null)
	$(node.previousElementSibling).css({
		stroke: "rgba(50, 50, 50, 0.5)",
		strokeWidth: "1"
	});
	selection.splice(index, 1);
	updateSelectionViewer();
}

//Svuotare la selezione di nodi
function emptyNodeSelection() {
	selection = [];
	circles.css({
		stroke: "rgba(50, 50, 50, 0.5)",
		strokeWidth: "1"
	});
	if (rectCircles.length == 0)
		return;
	rectCircles.css({
		stroke: "rgba(50, 50, 50, 0.5)",
		strokeWidth: "1"
	});
}

//Avvio di una selezione nel node chart
function startNodeSelection(ev) {
	
	svg.style.cursor = "default";

	//Click su nodo
	if (ev.target.nodeName == "circle") {
		if (ev.ctrlKey) {
			var k = 0;
			while (k < selection.length && selection[k].id != ev.target.__data__.id) {
				k++;
			}
			if (k == selection.length)
				addNode(ev.target);
			else
				removeNode(ev.target, k);
		}
		else {
			emptyNodeSelection();
			addNode(ev.target);
		}
		return;
	}
		
	//Selezione con area
	ctrl = ev.ctrlKey;
	if (!ctrl) {
		emptyNodeSelection();
		updateSelectionViewer();
	}
	selector = $(document.createElement("div")).attr("id", "nodeSelector").css({
		left: ev.offsetX + "px",
		top: ev.offsetY + "px"
	});
	$(svgContainer).append(selector);
	selecting = requestAnimationFrame(function() {
		return nodeSelection(ev.offsetX, ev.offsetY, ev.clientX, ev.clientY);
	});
	
}

//Funzione che avviene durante la selezione multipla nel node chart
function nodeSelection(originX, originY, startX, startY) {
	
	//Disegno del rettangolo
	var width = mouseX - startX;
	var height = mouseY - startY;
	if (width < 0) {
		selector.css("left", originX + width);
		width = Math.abs(width);
	}
	if (height < 0) {
		selector.css("top", originY + height);
		height = Math.abs(height);
	}
	selector.css({
		width: width + "px",
		height: height + "px"
	});
	
	//Selezione	
	var rectCoords = selector[0].getBoundingClientRect();
	for (var i = 0; i < circles.length; i++) {
		
		var circCoords = circles[i].getBoundingClientRect();
		
		//Individuazione del nodo nella selezione se presente
		var k = 0;
		while (k < selection.length && selection[k].id != circles[i].__data__.id) {
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
			else {
				if (k == selection.length && circles[i].lastTrackedStatus == "selected")
					addNode(circles[i]);
				else if (k < selection.length && circles[i].lastTrackedStatus == "unselected")
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
		return nodeSelection(originX, originY, startX, startY);
	});
	
}

//Fine della selezione multipla
function stopNodeSelection() {
	if (selecting) {
		cancelAnimationFrame(selecting);
		selecting = false;
		selector.remove();
	}
}

//Tiene memoria dell'ultima condizione del nodo in base al suo aspetto
function checkNodeSelection() {
	for (var i = 0; i < circles.length; i++) {
		circles[i].lastTrackedStatus = (circles[i].style.stroke == "rgba(0, 0, 0, 0.9)") ? "selected" : "unselected";
	}
}

//Conferma la selezione multipla dei nodi
function confirmNodeSelection() {
	checkNodeSelection();
	stopNodeSelection();
}

			/* BARRE */

//Aggiunge una barra alla selezione
function addBar(bar, data) {
	if (data.timestamp[9] == "1") {
		$("#multiDaySelection").modal();
		return;
	}
	$(bar).css({
		stroke: "black",
		strokeWidth: "1",
		strokeOpacity: "1"
	});
	selection.push(data);
	updateSelectionViewer();
}

//Rimuove una barra dalla selezione
function removeBar(bar, index) {
	$(bar).css({
		stroke: "",
		strokeWidth: "",
		strokeOpacity: ""
	});
	selection.splice(index, 1);
	updateSelectionViewer();
}

//Funzione di selezione delle barre
function selectBars(ev) {

	if (ev.button != 0)
		return;

	//Memorizzo le informazioni sull'oggetto	
	var data = this.__data__;
	var obj = {
		area: data.key,
		timestamp: data.x,
		timeSpan: currentBarTimeSpan
	}
	
	//Selezione multipla
	if (ev.ctrlKey) {
		var j = 0;
		while (j < selection.length && (JSON.stringify(selection[j]) != JSON.stringify(obj))) {
			j++;
		}
		if (j < selection.length)
			removeBar(this, j);
		else
			addBar(this, obj);
	}
	
	//Selezione semplice
	else {
		selection = [];
		rects.not(this).css({
			stroke: "",
			strokeWidth: "",
			strokeOpacity: ""
		});
		addBar(this, obj);
	}

}

//Controlla se una barra si trova già nella selezione alla sua creazione
function checkBarSelection() {
	rects.each(function(i, d) {	
		var data = d.__data__;
		var obj = {
			area: data.key,
			timestamp: data.x,
			timeSpan: currentBarTimeSpan
		}
		var j = 0;
		while (j < selection.length && (JSON.stringify(selection[j]) != JSON.stringify(obj))) {
			j++;
		}
		if (j < selection.length)
			$(d).css({
				stroke: "black",
				strokeWidth: "1",
				strokeOpacity: "1"
			});
	});
}

			/* INTERFACCIA */
			
function updateSelectionViewer() {
	
	//Token
	var html = "";
	for (var i = 0; i < selection.length; i++) {
		if (selection[i].id != undefined)
			html += "<span class='selectionLabel'>ID " + selection[i].id + "</span>";
		else {
			var startDate = new Date(selection[i].timestamp);
			var endDate = new Date(startDate);
			endDate.setTime(endDate.getTime() + selection[i].timeSpan);
			html += "<span class='selectionLabel' style='background-color: " + areaColors[selection[i].area] + "'>"; 
			html += selection[i].area + ", " + d3.time.format("%A, %H:%M")(startDate) + "-" + d3.time.format("%H:%M")(endDate);
			html += "</span>";
		}
	}
	if (selection.length > 0)
		document.getElementById("buttonsContainer").style.display = "flex";
	else 
		document.getElementById("buttonsContainer").style.display = "";
	selectionViewer.innerHTML = html;
	
	//Aspetto
	selectionViewer.scrollTop = selectionViewer.scrollHeight - selectionViewer.clientHeight;
	
}

function updateViewingInfo() {
	
	//Secondo il tipo di grafico
	var chartString = "";
	switch (chart) {
		
		case "node":
		if (showSelection.length == 0 || !selectionHasArea)
			chartString = "Major communications ";
		else
			chartString = "Major outbound communications ";
		break;
		
		case "bar":
		chartString = (barOutbound || !selectionHasId) ? "Evolution of outbound communications " : "Evolution of communications";
		break;
		
		case "pattern":
		chartString = "Communications ";
		
	}
	
	//Senza selezione
	if (showSelection.length == 0)
		viewingDescription = "<span class='well'>" + chartString + "occurred on " + day + ".</span>";
	
	//Selezione senza aree
	else {
		if (!selectionHasArea) {
			var idHtml = "";
			for (var i = 0; i < showSelection.length; i++) {
				idHtml += "<span class='selectionLabel'>ID " + showSelection[i].id + "</span>";
			}
			viewingDescription = "<div class='description'>" + chartString + "involving ID:</div>" + idHtml;
		}
		
		//Selezione con aree
		else {
			var areaHtml = "";
			var idHtml = "";
			for (var i = 0; i < showSelection.length; i++) {
				if (showSelection[i].id != undefined)
					idHtml += "<span class='selectionLabel'>ID " + showSelection[i].id + "</span>";
				else {
					var startDate = new Date(showSelection[i].timestamp);
					var endDate = new Date(startDate);
					endDate.setTime(endDate.getTime() + showSelection[i].timeSpan);
					areaHtml += "<span class='selectionLabel' style='background-color: " + areaColors[showSelection[i].area] + "'>"; 
					areaHtml += showSelection[i].area + ", " + d3.time.format("%A, %H:%M")(startDate) + "-" + d3.time.format("%H:%M")(endDate);
					areaHtml += "</span>";
				}
			}
			viewingDescription = "<div class='description'>" + chartString + "occurred in:</div>" + areaHtml;
			if (idHtml != "")
				viewingDescription += "<div class='description'>Involving ID:</div>" + idHtml;
		}
	}
	
	//Operazioni indipendenti dal grafico
	$("#viewingContent").html(viewingDescription);
	if (showSelection.length > 0)
		reselectContainer.show();
	else
		reselectContainer.hide();
}