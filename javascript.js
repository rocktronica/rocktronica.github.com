var data = {};

// fake out native console and localStorage
window.console = window.console || { log: function(){} };
window.localStorage = window.localStorage || {};

// optional URL params
// user: github username to use instead of whatever's hardcoded below
// cache: set to false to disable localStorage saving

$.fn.ready(function(){

	var $container = $("#container"),
		bAllowCache = true,
		sUser = "rocktronica";

	if (!!location.search) {
		sUser = !!location.search.split("user=")[1] ? location.search.split("user=")[1].split("&")[0] : undefined|| sUser;
		bAllowCache = location.search.indexOf("cache=false") === -1;
	}

	function renderHtml(data){
		console.log("start render");
		var template = $("#scrTemplate").html();
		var sHtml = Mustache.to_html(template, data);
		$container.html(sHtml);
		console.log("finish render");
	}
	
	function validData(data) { return (!!data.profile && !!data.repos && !!data.watching); }

	function getData(user){
		// make all ajax calls async, render when data is full
		// surely there's a better way to do this. deferred/promises, maybe?
		// at least abstracted better...
		$.each([
			// user profile info
			function(cb){
				console.log("start profile");
				$.getJSON("https://api.github.com/users/"+user+"?callback=?", function(resp) {
					data.profile = resp.data;
					console.log("finish profile");
					if (typeof cb === "function") { cb(); }
				});
			},
			// user's repos
			function(cb){
				console.log("start repos");
				$.getJSON("https://api.github.com/users/"+user+"/repos?per_page=100&callback=?", function(resp) {
					// clean up dates
					$.each(resp.data, function(i, repo) {
						var d = repo.created_at;
						repo.created_at = parseInt(d.substr(5,2), 10) + "-" + parseInt(d.substr(8,2), 10) + "-" + d.substr(0,4);
					});
					// reverse chrono order, like a blog
					data.repos = resp.data.reverse();
					console.log("finish repos");
					if (typeof cb === "function") { cb(); }
				});
			},
			// user's gists
			function(cb){
				console.log("start gists");
				$.getJSON("https://api.github.com/users/"+user+"/gists?per_page=100&callback=?", function(resp) {
					// clean up dates, set language, shoot for a meaningful title
					$.each(resp.data, function(i, gist) {
						var d = gist.created_at;
						gist.created_at = parseInt(d.substr(5,2), 10) + "-" + parseInt(d.substr(8,2), 10) + "-" + d.substr(0,4);
						if (!!gist.files) {
							$.each(gist.files, function(ii, file) {
								gist.language = file.language;
								gist.name = file.filename;
								// jk, we only want the first one for now
								return false;
							});
						}
					});
					// reverse chrono order, like a blog
					data.gists = resp.data.reverse();
					console.log("finish gists");
					if (typeof cb === "function") { cb(); }
				});
			},
			// watched repos
			function(cb){
				console.log("start watching");
				$.getJSON("https://api.github.com/users/"+user+"/watched?per_page=100&callback=?", function(resp) {
					data.watching = resp.data;
					console.log("finish watching");
					if (typeof cb === "function") { cb(); }
				});
			},
			// followers
			function(cb){
				console.log("start followers");
				$.getJSON("https://api.github.com/users/"+user+"/followers?per_page=100&callback=?", function(resp) {
					data.followers = resp.data;
					console.log("finish followers");
					if (typeof cb === "function") { cb(); }
				});
			},
			// following
			function(cb){
				console.log("start following");
				$.getJSON("https://api.github.com/users/"+user+"/following?per_page=100&callback=?", function(resp) {
					data.following = resp.data;
					console.log("finish following");
					if (typeof cb === "function") { cb(); }
				});
			}
		], function(i, action) {
			action(function(){
				if (validData(data)) {
					data.lastRun = (function() {
						var d = new Date();
						return d.getTime();
					}());
					localStorage[user] = JSON.stringify(data);
					renderHtml(data);
				}
			});
		});
	}

	(function(data){

		if (localStorage[sUser]) {
			var localData = $.parseJSON(localStorage[sUser]);
			if (validData(localData) && !!localData.lastRun) {
				var now = (function(){ var d = new Date(); return d.getTime(); }());
				var minutes = Math.floor((now - localData.lastRun) / 1000 / 60);
				if (minutes < 60 && bAllowCache) {
					console.log("data valid and not too old");
					window.data = data = localData;
					renderHtml(data);
					return false;
				}
			}
		}

		console.log("data missing or cache disabled");
		getData(sUser);
	
	}(data));

});