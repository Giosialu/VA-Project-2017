var express = require("express");
var app = express();
var mysql = require ("mysql");
var fs = require("fs");

app.use(express.static(__dirname));

var conn;

var server = app.listen(8080, function(err) {
	if (err) throw err;
	console.log("The server is listening on :8080.");
	
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
	
	app.get("/SQLRequest", function(req, res) {
		console.log("Going to execute the query:", req.query.sql);
		conn.query(req.query.sql, function(err, result) {
			if (err) throw err;
			console.log("The query successfully returned " + result.length + " rows.");
			res.json(result);
		});
	});
	
	//Invio del grafico dei nodi
	app.get("/nodeRequest", function(req, res) {
		console.log("Request received for node chart data");
		console.log("Options:", req.query);
		
		fs.readFile("assets/data/nodeData" + req.query.day + ".json", function(err, result) {
			
			if (err) throw err;
			result = JSON.parse(result.toString());
			console.log("Loaded " + result.nodes.length + " nodes and " + result.links.length + " links.");
			
			var values;
			var minValue;
			
			//Individuazione degli archi deboli
			values = [];
			for (var i = 0; i < result.links.length; i++) {
				values.push(result.links[i].value);
			}
			values.sort(function(a,b) {
				return a - b;
			});
			minValue = values[values.length - req.query.maxLinks];
			
			//Eliminazione degli archi deboli
			result.links = result.links.filter(function(d) {
				return d.value > minValue;
			});
			
			//Individuazione dei nodi deboli
			var values = [];
			for (var i = 0; i < result.nodes.length; i++) {
				values.push(result.nodes[i].inValue + result.nodes[i].outValue);
			}
			values.sort(function(a,b) {
				return a - b;
			});
			minValue = values[values.length - req.query.maxNodes];	
			
			//Eliminazione dei nodi deboli e aggiornamento degli indici degli archi
			for (var i = 0; i < result.nodes.length; i++) {
				if (result.nodes[i].inValue + result.nodes[i].outValue < minValue) {
					result.nodes.splice(i, 1);
					for (var j = 0; j < result.links.length; j++) {
						var arco = result.links[j];
						if (arco.source == i || arco.target == i) {
							result.links.splice(j, 1)
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
			
			console.log("Data processed for " + result.nodes.length + " nodes and " + result.links.length + " links.");
			
			//Riduzione del valore degli archi per una migliore rappresentazione
			for (var i = 0; i < result.links.length; i++) {
				result.links[i].value /= 100;
			}
			
			//Invio dei dati al client
			res.json(JSON.stringify(result));
			
		});
	});
	
});