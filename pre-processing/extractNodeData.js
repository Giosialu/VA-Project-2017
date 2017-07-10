//Variabili di moduli
var fs = require("fs");
var mysql = require("mysql");

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
	
	//Variabile personalizzabile per l'estrazione dei dati
	var dayString = "Sunday";

	var sql = "SELECT fromId, toId FROM " + dayString + ";";
	
	//Variabili per il processing
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
	console.log("Executing the following query:", sql);	
	conn.query(sql, function(err, result) {
		if (err) throw err;
		console.log("The query successfully returned " + result.length + " rows.");
		
		//Processing dei dati
		for (var i = 0; i < result.length; i++) {
		
			if (i % 1000 == 0)
				console.log("Processing data " + i + "/" + result.length);
			
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
		
		//Scrittura dei dati in un file
		fs.writeFile("../assets/data/nodeData" + dayString + ".json", JSON.stringify(nodeData), function(err) {
			if (err) throw err;
			console.log("Processed data have been saved in the data folder.");
		});
		
	});
});