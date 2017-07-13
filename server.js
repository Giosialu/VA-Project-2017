var express = require("express");
var app = express();
var mysql = require ("mysql");
var fs = require("fs");

app.use(express.static(__dirname));

var conn;

var server = app.listen(8080, function(err) {
	if (err) throw err;
	console.log("The server is listening on :8080.");
	
			/* FONDAMENTI DELLA CONNESSIONE */
	
	conn = mysql.createConnection({
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
	
	/*
	app.get("/SQLRequest", function(req, res) {
		console.log("Going to execute the query:", req.query.sql);
		conn.query(req.query.sql, function(err, result) {
			if (err) throw err;
			console.log("The query successfully returned " + result.length + " rows.");
			res.json(result);
		});
	});
	*/

			/* FUNZIONI PER LO SCAMBIO DEI DATI */
	
	//Extract data from database and convert in forceDirectedGraph data notation
	function extractNodeData(query) {
		
		return {
			nodes: [],
			links: []
		};
		
	}
	
	//Process node graph data to send only a viewable number of nodes and links
	function processNodeData(data, maxNodes, maxLinks) {
		console.log("Loaded " + data.nodes.length + " nodes and " + data.links.length + " links.");
		
		var values;
		var minValue;
		
		//Individuazione degli archi deboli
		values = [];
		for (var i = 0; i < data.links.length; i++) {
			values.push(data.links[i].value);
		}
		values.sort(function(a,b) {
			return a - b;
		});
		minValue = values[values.length - maxLinks];
		
		//Eliminazione degli archi deboli
		data.links = data.links.filter(function(d) {
			return d.value > minValue;
		});
		
		//Individuazione dei nodi deboli
		var values = [];
		for (var i = 0; i < data.nodes.length; i++) {
			values.push(data.nodes[i].inValue + data.nodes[i].outValue);
		}
		values.sort(function(a,b) {
			return a - b;
		});
		minValue = values[values.length - maxNodes];	
		
		//Eliminazione dei nodi deboli e aggiornamento degli indici degli archi
		for (var i = 0; i < data.nodes.length; i++) {
			if (data.nodes[i].inValue + data.nodes[i].outValue < minValue) {
				data.nodes.splice(i, 1);
				for (var j = 0; j < data.links.length; j++) {
					var arco = data.links[j];
					if (arco.source == i || arco.target == i) {
						data.links.splice(j, 1)
						j--;
						continue;
					}
					if (arco.source > i)
						arco.source--;
					if (arco.target > i)
						arco.target--;
				}
				i--;
			}
		}
		
		//Riduzione del valore degli archi per una migliore rappresentazione
		for (var i = 0; i < data.links.length; i++) {
			data.links[i].value /= 100;
		}
		
		console.log("Data processed for " + data.nodes.length + " nodes and " + data.links.length + " links.");
		return data;
	}
	
				/* RICHIESTE DAL CLIENT */
	
	//Grafici di nodi
	app.get("/nodeRequest", function(req, res) {
		console.log("Request received for node chart data");
		console.log("Options:", req.query);
		
		var query = JSON.parse(req.query.selection.toString());
		
		console.log(query);
		
		//Da una selezione
		if (query.length > 0) {
			res.json(JSON.stringify(processNodeData(extractNodeData(query), req.query.maxNodes, req.query.maxLinks)));
			return;
		}
		
		//Su un'intera giornata
		fs.readFile("assets/data/nodeData" + req.query.day + ".json", function(err, result) {
			if (err) throw err;
			res.json(JSON.stringify(processNodeData(JSON.parse(result.toString()), req.query.maxNodes, req.query.maxLinks)));
		});
	});
		
});