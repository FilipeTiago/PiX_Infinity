window.addEventListener('load', function() {
	document.getElementById("toggleOn").onclick = function() {
		chrome.runtime.sendMessage({method: "toogleKeyboardOn"}, function(response) {
			window.close();	
		});
	}
	document.getElementById("settings").onclick = function() {
		window.open(chrome.runtime.getURL("options.html"));
	}
	document.getElementById("toggleOff").onclick = function() {
		chrome.runtime.sendMessage({method: "toogleKeyboardOff"}, function(response) {
			window.close();	
		});
	}
	document.getElementById("toggleDemand").onclick = function() {
		chrome.runtime.sendMessage({method: "toogleKeyboardDemand"}, function(response) {
			window.close();	
		});
	}
	document.getElementById("goToUrl").onclick = function() {
		chrome.runtime.sendMessage({method: "openUrlBar"}, function(response) {
			callback(response.data);
		});
		window.close();
	}

	chrome.storage.local.get(null, storage => {
		if (storage["keyboardEnabled"] == "demand") {
			document.getElementById("toggleDemand").className = "active";
		} else if (storage["keyboardEnabled"] != "false") {
			document.getElementById("toggleOn").className = "active";
		} else {
			document.getElementById("toggleOff").className = "active";
		}
	});

}, false);
