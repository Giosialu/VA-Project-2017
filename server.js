var express = require("express");
var app = express();
var mysql = require ("mysql");
var fs = require("fs");

app.use(express.static(__dirname));



			/* FONDAMENTI DELLA CONNESSIONE */

var server = app.listen(8080, function(err) {
	if (err) throw err;
	console.log("The server is listening on :8080.");
	
	var io = require("socket.io")(server);
	io.on("connection", function() {
		console.log("Socket activated.");
	});

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
	
	app.get("/" || "/index.html", function(req, res) {
		res.sendFile(__dirname + "index.html");
		console.log("Sending the website.");
	});
	
	
	
			/* VARIABILI E FUNZIONI PER LO SCAMBIO DEI DATI */
	
	//Variabili 
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
	
	//Creazione della stringa da inserire nella query SQL in caso di ID ed aree
	function createINString(ids) {
		var str = "";
		for (var i = 0; i < ids.length; i++) {
			str += "'" + ids[i] + "'";
			if (i < ids.length - 1)
				str += ", ";
		}
		return str;
	}
	
	//Extract data from database and convert in forceDirectedGraph data notation
	function extractNodeData(req, res) {
		var selection = JSON.parse(req.query.selection.toString());
		
		//Definizione di necessità di query al DB
		var i = 0;
		while (i < selection.length && selection[i].area == undefined) {
			i++;
		}
		
		
		/* CASO DI SOLI ID */
		
		if (i == selection.length) {
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
		
		
		/* CASO DI PRESENZA AREE */
		
		//Creazione della query SQL
		var queries = [];
		var ids = [];
		for (var i = 0; i < selection.length; i++) {
			if (selection[i].id != undefined)
				ids.push(selection[i].id);
			else {
				var startDate = new Date(selection[i].timestamp);
				startDate.setHours(startDate.getHours() + 2);
				var endDate = new Date(startDate);
				endDate.setMinutes(endDate.getMinutes() + 30);
				var day = dayNames[selection[i].timestamp[9]];
				var str = "SELECT fromId, toId FROM " + day + " WHERE Location = '" + selection[i].area + "' && Timestamp BETWEEN '" + startDate.toISOString() + "' AND '" + endDate.toISOString() + "'";
				queries.push(str);
			}
		}
		
		var addedCondition = "";
		if (ids.length > 0)
			addedCondition = " && (fromID IN (" + createINString(ids) + ") || toID IN (" + createINString(ids) + "))";
		
		var sql = "";
		
		for (var i = 0; i < queries.length; i++) {
			sql += queries[i];
			sql += addedCondition;
			if (i < queries.length - 1)
				sql += " UNION ALL ";
			else
				sql += ";";
		}
	
		//Altre variabili per il processing
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
			
			//Processing dei dati
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
	
	//Process node graph data to send only a viewable number of nodes and links
	function processNodeData(data, req, res, selection = []) {
		console.log("Received " + data.nodes.length + " nodes and " + data.links.length + " links. Processing...");
		lastLoadedData = JSON.stringify(data);
		var startTime = new Date();
				
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
		var endTime = new Date();
		if (typeof(startTime) != "undefined")
			console.log("Processing required " + (endTime.getTime() - startTime.getTime()) / 1000 + " seconds.")
		
		sendLoadingData("Receiving data...", 100);
		sendData(data, res);
		
	}
	
	
	
				/* RICHIESTE DAL CLIENT */
	
	function sendData(data, res) {
		res.json(data);
	}
	
	//Grafici di nodi
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
	
	app.get("/updateNodeChart", function(req, res) {
		filterNodeData(JSON.parse(lastLoadedData), JSON.parse(lastSortedNodes), JSON.parse(lastSortedLinks), req, res);
	});
		
});