//Variabili di moduli
var fs = require("fs");
var mysql = require("mysql");
var d3 = require("d3");

//Variabile di connessione
conn = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "myPassword123",
	database: "Communications"
});

//Connessione al db
conn.connect(function(err) {
	if (err) throw err;
	console.log("Successfully connected to the db.");
	
	//Variabili personalizzabili per l'estrazione dei dati
	var dayString = "Sunday";
	var timeSpan = 30;	//In minuti

	sql = "SELECT Timestamp, location FROM " + dayString + ";";
	
	//Variabili necessarie per il processing
	var days = {
		"Friday": 0,
		"Saturday": 1,
		"Sunday": 2
	}
	var areaColors = {
		"Tundra Land": "PowderBlue",//"rgb(219, 238, 244)",
		"Entry Corridor": "Gainsboro",//"rgb(237, 234, 241)",
		"Kiddie Land": "PapayaWhip",//"rgb(255, 243, 203)",
		"Wet Land": "DarkSeaGreen",//"rgb(196, 213, 159)",
		"Coaster Alley": "Salmon" //"rgb(217, 149, 146)"
	};
	//Gli orari di apertura e chiusura del parco sono indietro di due ore per il fuso orario automatico GMT+0200 alla conversione dalle stringhe
	var openingDates = [new Date("2014-06-06T06:00:00.000Z"), new Date("2014-06-07T06:00:00.000Z"), new Date("2014-06-08T06:00:00.000Z")];
	var closingDates = [new Date("2014-06-06T22:00:00.000Z"), new Date("2014-06-07T22:00:00.000Z"), new Date("2014-06-08T22:00:00.000Z")];
	var day = days[dayString];
	
	
	//Richiesta di dati al db
	console.log("Executing the following query:", sql);
	conn.query(sql, function(err, result) {
		if (err) throw err;
		console.log("The query successfully returned " + result.length + " rows.");
		
		//Processing dei dati
		result.forEach(function(d, i) {
			d.Timestamp = new Date(d.Timestamp);
		});
		
		var counter = 0;
		
		result = d3.nest()
			.key(function(d) {return d.location})
			.rollup(function(leaves) {
				counter++;
				console.log("Processing data " + counter + "/5");
				var tempValues = [];
				var tempData = [];
				var tempTimeStart;
				var tempTimeEnd;
				for (tempTimeStart = new Date(openingDates[day]); tempTimeStart < closingDates[day]; tempTimeStart.setMinutes(tempTimeStart.getMinutes() + timeSpan)) {
				
					tempTimeEnd = new Date(tempTimeStart);
					tempTimeEnd.setMinutes(tempTimeEnd.getMinutes() + timeSpan);
				
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
			
		result.forEach(function(d) {
			d.color = areaColors[d.key];
		});
		
		//Scrittura dei dati in un file
		fs.writeFile("../assets/data/barData" + dayString + ".json", JSON.stringify(result), function(err) {
			if (err) throw err;
			console.log("Processed data have been saved in the data folder.");
		});

	});
});