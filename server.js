var express = require("express");
var app = express();
var mysql = require ("mysql");

app.use(express.static(__dirname));

var conn;

var server = app.listen(8080, function(err) {
	if (err) throw err;
	console.log("The server is listening on :8080.");
	
	//Opzioni delle due connessioni
	conn = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "myPassword123",
		database: "Communications"
	});
	
	//Creazione delle due connessioni
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
	
});