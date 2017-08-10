var express = require("express");
var app = express();
var mysql = require ("mysql");
var fs = require("fs");
var d3 = require("d3");

app.use(express.static(__dirname));


				/* FONDAMENTI DELLA CONNESSIONE */

					
var server = app.listen(8080, function(err) {
	if (err) throw err;
	console.log("The server is listening on :8080.");
	
	//Socket
	var io = require("socket.io")(server);
	io.on("connection", function() {
		console.log("Socket activated.");
	});
	
	//Connessione al db
	var conn = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "myPassword123",
		database: "Communications"
	});
	conn.connect(function(err) {
		if (err) throw err;
		console.log("Successfully connected to the db.");
	});
	
	//Hosting
	app.get("/" || "/index.html", function(req, res) {
		res.sendFile(__dirname + "index.html");
		console.log("Sending the website.");
	});
	
	
				/* VARIABILI E FUNZIONI PER LO SCAMBIO DEI DATI */
	
	
	//Variabili 
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
	var lastLoadedData;
	var lastSortedNodes;
	var lastSortedLinks;
	
	//Dati sul caricamento
	function sendLoadingData(text, percentage) {
		io.send({
			subject: "loadingData",
			text: text,
			percentage: percentage
		});
	}
	
	//Creazione della stringa per la selezione di ID nelle query SQL
	function createINString(ids) {
		var str = "";
		for (var i = 0; i < ids.length; i++) {
			str += "'" + ids[i] + "'";
			if (i < ids.length - 1)
				str += ", ";
		}
		return str;
	}
	
	//Creazione della query SQL
	function createSQLQuery(columnString, selection, day, onlyOutbound = false, restrictive = false) {
		
		var queries = [];	//Selezione di aree
		var ids = [];	//Selezione di ID
		for (var i = 0; i < selection.length; i++) {
			if (selection[i].id != undefined)
				ids.push(selection[i].id);
			else {
				var startDate = new Date(selection[i].timestamp);
				startDate.setHours(startDate.getHours() + 2);	//Fuso orario
				var endDate = new Date(startDate);
				endDate.setTime(endDate.getTime() + selection[i].timeSpan);
				var table = dayNames[selection[i].timestamp[9]];
				var str = "SELECT " + columnString + " FROM " + table + " WHERE Location = '" + selection[i].area + "' && Timestamp BETWEEN '" + startDate.toISOString() + "' AND '" + endDate.toISOString() + "'";
				queries.push(str);
			}
		}
		
		var addedCondition = "";
		if (ids.length > 0) {
			if (onlyOutbound)
				addedCondition = "fromID IN (" + createINString(ids) + ")";
			else if (restrictive)
				addedCondition = "(fromID IN (" + createINString(ids) + ") && toID IN (" + createINString(ids) + "))";
			else
				addedCondition = "(fromID IN (" + createINString(ids) + ") || toID IN (" + createINString(ids) + "))";
		}
	
		var sql = "";
		if (queries.length == 0) {
			sql += "SELECT " + columnString + " FROM " + day + " WHERE " + addedCondition + ";";
			return sql;
		}
		for (var i = 0; i < queries.length; i++) {
			sql += queries[i];
			if (addedCondition != "")
				sql += " && " + addedCondition;
			if (i < queries.length - 1)
				sql += " UNION ALL ";
			else
				sql += ";";
		}
		return sql;
		
	}
	
	
				/* FUNZIONI PER IL NODE CHART */
	
	
	//1) Estrazione dei dati dai database e conversione nella notazione per il force directed graph
	function extractNodeData(req, res) {
		var selection = JSON.parse(req.query.selection.toString());
		
		//1.1 Caso di soli ID (senza connessione al db)
		
		if (req.query.selectionHasArea == "false") {
			
			//Estrazione dei dati direttamente dal file preparato
			result = JSON.parse(fs.readFileSync("assets/data/nodeData" + req.query.day + ".json").toString())
			console.log("Loaded " + result.nodes.length + " nodes and " + result.links.length + " links, now selecting data...");	
			sendLoadingData("Selecting data...", 50);
			
			var data = {
				nodes: [],
				links: []
			};
			
			//Definire gli ID coinvolti nelle comunicazioni degli ID selezionati
			var involvedIndexes = [];
			for (var i = 0; i < result.links.length; i++) {
				var arco = result.links[i];
				var j = 0;
				while (j < selection.length && (result.nodes[arco.source].id != selection[j].id && result.nodes[arco.target].id != selection[j].id)) {
					j++;					
				}
				if (j < selection.length) {
					if (involvedIndexes.indexOf(arco.source) == -1)
						involvedIndexes.push(arco.source);
					if (involvedIndexes.indexOf(arco.target) == -1)
						involvedIndexes.push(arco.target);
				}
			}
			
			//Inserire tra i dati tutti quelli che comprendono i nodi coinvolti
			for (var i = 0; i < result.links.length; i++) {
				var arco = result.links[i];
				if (involvedIndexes.indexOf(arco.source) != -1 && involvedIndexes.indexOf(arco.target) != -1) {
					data.nodes[arco.source] = result.nodes[arco.source];
					data.nodes[arco.target] = result.nodes[arco.target];
					data.links.push(arco);
				}
			}
			
			//Eliminare i nodi vuoti
			var nodes = [];
			var k = 0;
			for (var i = 0; i < data.nodes.length; i++) {
				if (data.nodes[i] != undefined)
					nodes.push(data.nodes[i]);
				else {
					for (var j = 0; j < data.links.length; j++) {
						var arco = data.links[j];
						if (arco.source > i - k)
							arco.source--;
						if (arco.target > i - k)
							arco.target--;
					}
					k++;
				}
			}
			data.nodes = nodes;
			
			sendLoadingData("Processing data...", 75);
			processNodeData(data, req, res, selection);
			return;
			
		}
		
		
		//1.2 Caso di presenza aree (con connessione al db)
		
		//Variabili per il processing
		var sql = createSQLQuery("fromId, toId", selection, req.query.day);

		var nodeData = {
			nodes: [],
			links: []
		};
		
		function findIndex(nodeData, result, i, id) {
			var j = 0;
			while (j < nodeData.nodes.length && nodeData.nodes[j].id != result[i][id]) {
				j++;
			}
			if (j < nodeData.nodes.length)
				return j;
			else {
				nodeData.nodes.push({
					id: result[i][id],
					inValue: 0,
					outValue: 0
				});
				return nodeData.nodes.length - 1;
			}
		}
			
		//Richiesta di dati al db
		console.log("Executing the following query:\n", sql);	
		conn.query(sql, function(err, result) {
			if (err) throw err;
			console.log("The query successfully returned " + result.length + " rows.");
			sendLoadingData("Selecting data...", 50);
			
			//Conversione della struttura dei dati
			for (var i = 0; i < result.length; i++) {
				
				var fromIndex = findIndex(nodeData, result, i, "fromId");
				var toIndex = findIndex(nodeData, result, i, "toId");
				
				nodeData.nodes[fromIndex].outValue++;
				nodeData.nodes[toIndex].inValue++;
				
				var j = 0;
				while (j < nodeData.links.length && (nodeData.links[j].source != fromIndex || nodeData.links[j].target != toIndex)) {
					j++;
				}
				if (j < nodeData.links.length)
					nodeData.links[j].value++;
				else 
					nodeData.links.push({
						source: fromIndex,
						target: toIndex,
						value: 1
					});

			}
			
			sendLoadingData("Processing data...", 75);
			processNodeData(nodeData, req, res, selection);
			
		});
	}
	
	//2) Riduzione dei dati ad un numero che ne permetta la visualizzazione
	function processNodeData(data, req, res, selection = []) {
		console.log("Received " + data.nodes.length + " nodes and " + data.links.length + " links. Processing...");
		lastLoadedData = JSON.stringify(data);
				
		//Definizione presenza ID non filtrabili
		var requiredIds = [];		
		for (var i = 0; i < selection.length; i++) {
			if (selection[i].id != undefined)
				requiredIds.push(selection[i].id);
		}
		
		//Definizione degli indici non filtrabili
		var requiredIndexes = [];
		for (var i = 0; i < requiredIds.length; i++) {
			var j = 0;
			while (j < data.nodes.length && data.nodes[j].id != requiredIds[i]) {
				j++
			}
			requiredIndexes.push(j);
		}
		
		//Ordinamento dei nodi
		if (data.nodes.length > req.query.maxNodes) {
			var sortedNodes = [];
			for (var i = 0; i < data.nodes.length; i++) {
				sortedNodes.push(data.nodes[i]);
			}
			sortedNodes.sort(function(a, b) {
				if (requiredIds.indexOf(a.id) != -1)
					return -1;
				if (requiredIds.indexOf(b.id) != -1)
					return 1;
				return (b.inValue + b.outValue) - (a.inValue + a.outValue);
			});			
		}
		else
			var sortedNodes = data.nodes;		
		lastSortedNodes = JSON.stringify(sortedNodes);
		
		//Ordinamento degli archi
		if (data.links.length > req.query.maxLinks) {
				var sortedLinks = [];
			for (var i = 0; i < data.links.length; i++) {
				sortedLinks.push(data.links[i]);
			}
			sortedLinks.sort(function(a, b) {
				var importanceA = 1;
				var importanceB = 1;
				if (requiredIndexes.indexOf(a.source) != -1)
					importanceA *= 10;
				if (requiredIndexes.indexOf(a.target) != -1)
					importanceA *= 10;
				if (requiredIndexes.indexOf(b.source) != -1)
					importanceB *= 10;
				if (requiredIndexes.indexOf(b.target) != -1)
					importanceB *= 10;
				return (b.value * importanceB) - (a.value * importanceA);
			});	
		}
		else 
			var sortedLinks = data.links;
		lastSortedLinks = JSON.stringify(sortedLinks);
		
		filterNodeData(data, sortedNodes, sortedLinks, req, res);
		
	}
	
	function filterNodeData(data, sortedNodes, sortedLinks, req, res) {
		
		//Filtraggio dei nodi
		if (sortedNodes.length > req.query.maxNodes) {
			var filteredNodes = [];
			for (var i = 0; i < sortedNodes.length && i < req.query.maxNodes; i++) {
				filteredNodes.push(sortedNodes[i]);
			}
		}
		else
			filteredNodes = sortedNodes;
		
		//Filtraggio degli archi
		var filteredLinks = [];
		for (var i = 0; i < sortedLinks.length && filteredLinks.length < req.query.maxLinks; i++) {
			var arco = sortedLinks[i];
			var fromId = data.nodes[arco.source].id;
			var fromIndex = 0;
			while (fromIndex < filteredNodes.length && filteredNodes[fromIndex].id != fromId) {
				fromIndex++;
			}
			var toId = data.nodes[arco.target].id;
			var toIndex = 0;
			while (toIndex < filteredNodes.length && filteredNodes[toIndex].id != toId) {
				toIndex++;
			}
			if (fromIndex == filteredNodes.length || toIndex == filteredNodes.length)
				continue;
			arco.source = fromIndex;
			arco.target = toIndex;
			filteredLinks.push(arco);
		}
					
		//Operazioni finali
		data.nodes = filteredNodes;
		data.links = filteredLinks;
		console.log("Data processed for " + data.nodes.length + " nodes and " + data.links.length + " links.");
		sendLoadingData("Receiving data...", 100);
		sendData(data, res);
		
	}
		
	
				/* FUNZIONE DEL BAR CHART */
	
	
	function extractBarData(req, res) {
		
		//Definizione della query
		var selection = JSON.parse(req.query.selection.toString());
		var sql = createSQLQuery("Timestamp, location", selection, req.query.day, eval(req.query.barOutbound), eval(req.query.barRestrictive));
		
		//Richiesta dei dati al DB
		console.log("Executing the following query:\n", sql);	
		conn.query(sql, function(err, result) {
			if (err) throw err;
			console.log("The query successfully returned " + result.length + " rows.");
			sendLoadingData("Processing data...", 66);
			selectionHasDay = Number(req.query.selectionHasDay);
			
			//Definizione del range temporale dei dati
			if (req.query.selectionHasArea == "false") {
				var minDate = new Date("2014-06-01T06:00:00.000Z");
				var maxDate = new Date("2014-06-01T22:00:00.000Z");
				minDate.setDate(selectionHasDay);
				maxDate.setDate(selectionHasDay + 1);	//Essendo la mezzanotte, deve essere del giorno dopo
			}
			else {
				var startDates = [];
				var endDates = [];
				for (var i = 0; i < selection.length; i++) {
					d = selection[i];
					if (d.timestamp == undefined)
						continue;
					
					d.timestamp = new Date(d.timestamp);
					if (selectionHasDay == 1)
						d.timestamp.setDate(1);		//Per guardare all'orario indipendentemente dal giorno
					
					startDates.push(d.timestamp);
					var endDate = new Date(d.timestamp);
					endDate.setTime(endDate.getTime() + d.timeSpan);
					endDates.push(endDate);
				}
				var minDate = new Date(d3.min(startDates));
				var maxDate = new Date(d3.max(endDates));
			}

			var timeSpan = (maxDate.getTime() - minDate.getTime()) / 32;

			result.forEach(function(d, i) {
				d.Timestamp = new Date(d.Timestamp);
				if (selectionHasDay == 1)
					d.Timestamp.setDate(1);		//Per guardare all'orario indipendentemente dal giorno
			});
			
			//Conversione della struttura dei dati nella notazione richiesta da NVD3
			result = d3.nest()
				.key(function(d) {return d.location})
				.rollup(function(leaves) {
					var tempValues = [];
					var tempData = [];
					var tempTimeStart;
					var tempTimeEnd;
					for (tempTimeStart = new Date(minDate); tempTimeStart < maxDate; tempTimeStart.setTime(tempTimeStart.getTime() + timeSpan)) {
					
						tempTimeEnd = new Date(tempTimeStart);
						tempTimeEnd.setTime(tempTimeEnd.getTime() + timeSpan);
					
						tempData = leaves.filter(function(d) {
							return (d.Timestamp >= tempTimeStart && d.Timestamp < tempTimeEnd);
						});
						
						tempValues.push({
							x: new Date(tempTimeStart),
							y: tempData.length
						});
						
					}
					return tempValues;
				})
				.entries(result);
			
			//Assegnazione dei colori in base alle aree
			result.forEach(function(d) {
				d.color = areaColors[d.key];
			});
			
			//Operazioni finali
			console.log("Data have been processed and are now being sent to the client.");
			sendLoadingData("Receiving data...", 100);
			io.send({
				subject: "additionalBarData",
				value: timeSpan
			});
			sendData(result, res);
			
		});
		
	}
	
				/* FUNZIONE DEL PATTERN CHART */
	
	
	function extractPatternData(req, res) {
		
		//Definizione della query
		var selection = JSON.parse(req.query.selection.toString());
		var moreThanOneId = false;
		var i = 0, nId = 0;
		while (i < selection.length && nId < 2) {
			if (selection[i].id != undefined)
				nId++;
			i++;
		}
		if (nId == 2)
			moreThanOneId = true;
		var sql = createSQLQuery("Timestamp, location, fromId, toId", selection, req.query.day, false, moreThanOneId);
		
		//Richiesta dei dati al DB
		console.log("Executing the following query:\n", sql);	
		conn.query(sql, function(err, result) {
			if (err) throw err;
			console.log("The query successfully returned " + result.length + " rows.");
			sendLoadingData("Processing data...", 66);
			
			//Definizione degli ID coinvolti e delle relative coordinate nel grafico
			var ids = [];
			for (var i = 0; i < result.length; i++) {
				if (ids.indexOf(result[i].fromId) == -1)
					ids.push(result[i].fromId);
				if (ids.indexOf(result[i].toId) == -1)
					ids.push(result[i].toId);
			}
			var coords = [];			
			for (var i = 0; i < ids.length; i++) {
				coords.push(40 + i * 40);
			}
			
			//Conversione della struttura dei dati nella notazione richiesta da NVD3
			result = d3.nest()
				.key(function(d) {return d.location})
				.rollup(function(leaves) {
					var values = [];
					for (var i = 0; i < leaves.length; i++) {
						values.push({
							x: leaves[i].Timestamp,
							y: leaves[i].fromId,
							shape: "triangle-up",
							id: leaves[i].fromId,
							target: leaves[i].toId,
							location: leaves[i].location
						}, {
							x: leaves[i].Timestamp,
							y: leaves[i].toId,
							shape: "triangle-down",
							id: leaves[i].toId,
							target: leaves[i].fromId
						});
					}
					return values;
				})
				.entries(result);
			
			//Operazioni finali
			console.log("Data have been processed and are now being sent to the client.");
			sendLoadingData("Receiving data...", 100);
			io.send({
				subject: "additionalPatternData",
				ids: ids,
				coords: coords
			});
			sendData(result, res);
			
		});
		
	}
	
	
				/* RICHIESTE DAL CLIENT */
	
	function sendData(data, res) {
		res.json(data);
	}
	
	//Node chart
	app.get("/nodeRequest", function(req, res) {
		console.log("Request received for node chart data");
		console.log("Options:", req.query);
		
		//Da una selezione
		if (req.query.selection != "[]") {
			sendLoadingData("Loading data...", 25);
			extractNodeData(req, res);
			return;
		}
		
		//Su un'intera giornata
		sendLoadingData("Loading data...", 33);
		fs.readFile("assets/data/nodeData" + req.query.day + ".json", function(err, result) {
			if (err) throw err;
			sendLoadingData("Processing data...", 66);
			processNodeData(JSON.parse(result.toString()), req, res);
		});
	});
	
	//Aggiornamento quantità massima di nodi o archi del node chart
	app.get("/updateNodeChart", function(req, res) {
		filterNodeData(JSON.parse(lastLoadedData), JSON.parse(lastSortedNodes), JSON.parse(lastSortedLinks), req, res);
	});
	
	
	//Bar chart
	app.get("/barRequest", function(req, res) {
		console.log("Request received for bar chart data");
		console.log("Options:", req.query);
		
		//Da una selezione
		if (req.query.selection != "[]") {
			sendLoadingData("Loading data...", 33);
			extractBarData(req, res);
			return;
		}
		
		//Su un'intera giornata
		sendLoadingData("Loading data...", 50);
		fs.readFile("assets/data/barData" + req.query.day + ".json", function(err, result) {
			if (err) throw err;
			sendLoadingData("Receiving data...", 100);
			io.send({
				subject: "additionalBarData",
				value: 1800000
			});
			sendData(JSON.parse(result.toString()), res);
		});
		
	});
	
	
	//Pattern chart
	app.get("/patternRequest", function(req, res) {
		console.log("Request received for pattern chart data");
		console.log("Options:", req.query);
		
		//Da una selezione (unico possibile caso)
		sendLoadingData("Loading data...", 33);
		extractPatternData(req, res);

	});
		
});