			/* NODI */

function addNode(node) {
	$(node).css({
		stroke: "rgba(0, 0, 0, 0.9)",
		strokeWidth: "1.3"
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

function startNodeSelection(ev) {
	
	svg.css("cursor", "default");
			
	//Click su nodo
	for (var i = 0; i < circles.length; i++) {
		var circCoords = circles[i].getBoundingClientRect();
		if (ev.clientX > circCoords.left && ev.clientX < circCoords.right && ev.clientY > circCoords.top && ev.clientY < circCoords.bottom) {
			if (ev.ctrlKey) {
				var k = 0;
				while (k < selection.length && selection[k].id != circles[i].__data__.id) {
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
			}
			return;
		}
	}
	
	//Selezione con area
	ctrl = ev.ctrlKey;
	if (!ctrl)
		selection = [];
	selector = d3.select("svg").append("rect").attr("id", "nodeSelector").attr("x", ev.offsetX).attr("y", ev.offsetY);
	selecting = requestAnimationFrame(function() {
		return nodeSelection(ev.offsetX, ev.offsetY, ev.clientX, ev.clientY);
	});
	
}

function nodeSelection(originX, originY, startX, startY) {
	
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

function confirmNodeSelection() {
	for (var i = 0; i < circles.length; i++) {
		circles[i].lastTrackedStatus = (circles[i].style.stroke == "rgba(0, 0, 0, 0.9)") ? "selected" : "unselected";
	}
	stopNodeSelection();
}

function stopNodeSelection() {
	if (selecting) {
		cancelAnimationFrame(selecting);
		selecting = false;
		selector.remove();
	}
}

function checkNodeSelection() {
	for (var i = 0; i < circles.length; i++) {
		circles[i].lastTrackedStatus = (circles[i].style.stroke == "rgba(0, 0, 0, 0.9)") ? "selected" : "unselected";
	}
}

			/* BARRE */

function addBar(bar, data) {
	$(bar).css({
		stroke: "black",
		strokeWidth: "1",
		strokeOpacity: "1"
	});
	selection.push(data);
	updateSelectionViewer();
}

function removeBar(bar, index) {
	$(bar).css({
		stroke: "",
		strokeWidth: "",
		strokeOpacity: ""
	});
	selection.splice(index, 1);
	updateSelectionViewer();
}

function selectBars(ev) {

	if (ev.button != 0)
		return;

	//Memorizzo le informazioni sull'oggetto	
	var data = this.__data__;
	var obj = {
		area: data.key,
		timestamp: data.x
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

function checkBarSelection() {
	rects.each(function(i, d) {	
		var data = d.__data__;
		var obj = {
			area: data.key,
			timestamp: data.x
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
		if (typeof(selection[i].id) != "undefined")
			html += "<span class='selectionLabel'>ID " + selection[i].id + "</span>";
		else {
			var startDate = new Date(selection[i].timestamp);
			var endDate = new Date(startDate);
			endDate.setMinutes(endDate.getMinutes() + 30);
			html += "<span class='selectionLabel' style='background-color: " + areaColors[selection[i].area] + "'>"; 
			html += selection[i].area + ", " + d3.time.format("%A, %H:%M")(startDate) + "-" + d3.time.format("%H:%M")(endDate);
			html += "</span>";
		}
	}
	selectionViewer.html(html);
	
	//Aspetto
	if (selectionViewer[0].scrollHeight > selectionViewer[0].clientHeight)
		selectionViewer.css({borderTop: "1px solid #ddd"});
	else
		selectionViewer.css({borderTop: "none"});
	selectionViewer[0].scrollTop = selectionViewer[0].scrollHeight - selectionViewer[0].clientHeight;
	
}